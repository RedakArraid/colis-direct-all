#!/bin/bash

# Script de vérification de la configuration de production
# Usage: ./check-production-config.sh

set -e

echo "=========================================="
echo "Vérification de la configuration production"
echo "=========================================="
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ENV_FILE=".env.production"
ERRORS=0
WARNINGS=0

# Fonction pour vérifier si un fichier existe
check_file() {
    if [ ! -f "$1" ]; then
        echo -e "${RED}✗${NC} Fichier manquant: $1"
        return 1
    else
        echo -e "${GREEN}✓${NC} Fichier présent: $1"
        return 0
    fi
}

# Fonction pour vérifier une variable d'environnement
check_env_var() {
    local var_name=$1
    local is_required=${2:-true}
    local value=$(grep "^${var_name}=" "$ENV_FILE" 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    
    if [ -z "$value" ]; then
        if [ "$is_required" = true ]; then
            echo -e "${RED}✗${NC} Variable manquante ou vide: ${var_name}"
            ((ERRORS++))
            return 1
        else
            echo -e "${YELLOW}⚠${NC} Variable optionnelle non définie: ${var_name}"
            ((WARNINGS++))
            return 0
        fi
    fi
    
    # Vérifications spéciales
    case $var_name in
        COLISDIRECT_JWT_SECRET)
            if [ "$value" = "CHANGEZ_CE_SECRET_JWT_EN_PRODUCTION" ]; then
                echo -e "${RED}✗${NC} ${var_name} n'a pas été changé depuis la valeur par défaut !"
                ((ERRORS++))
                return 1
            fi
            if [ ${#value} -lt 32 ]; then
                echo -e "${YELLOW}⚠${NC} ${var_name} semble trop court (minimum recommandé: 32 caractères)"
                ((WARNINGS++))
            fi
            ;;
        COLISDIRECT_DB_PASSWORD)
            if [ "$value" = "CHANGEZ_CE_MOT_DE_PASSE_EN_PRODUCTION" ]; then
                echo -e "${RED}✗${NC} ${var_name} n'a pas été changé depuis la valeur par défaut !"
                ((ERRORS++))
                return 1
            fi
            ;;
        VITE_API_URL)
            if [[ ! "$value" =~ ^https:// ]]; then
                echo -e "${YELLOW}⚠${NC} ${var_name} devrait utiliser HTTPS en production"
                ((WARNINGS++))
            fi
            ;;
        PAYSTACK_SECRET_KEY)
            if [[ "$value" =~ ^(sk_live_VOTRE|RENSEIGNER|CHANGEZ_) ]] || [[ ${#value} -lt 20 ]]; then
                echo -e "${YELLOW}⚠${NC} ${var_name} semble être un placeholder ou trop court pour la prod"
                ((WARNINGS++))
            fi
            ;;
    esac
    
    echo -e "${GREEN}✓${NC} ${var_name}: ${value:0:20}..."
    return 0
}

# Vérifier que le fichier .env.production existe
echo "1. Vérification des fichiers..."
if ! check_file "$ENV_FILE"; then
    echo ""
    echo -e "${RED}ERREUR: Le fichier ${ENV_FILE} n'existe pas !${NC}"
    echo "Créez-le en copiant le fichier exemple:"
    echo "  cp env.production.example .env.production"
    echo "Puis remplissez les valeurs nécessaires."
    exit 1
fi

echo ""
echo "2. Vérification des variables d'environnement requises..."

# Variables requises
check_env_var "COLISDIRECT_DB_NAME" true
check_env_var "COLISDIRECT_DB_USER" true
check_env_var "COLISDIRECT_DB_PASSWORD" true
check_env_var "COLISDIRECT_JWT_SECRET" true
check_env_var "VITE_API_URL" true

echo ""
echo "3. Vérification des paiements et optionnelles (recommandées)..."

check_env_var "PAYSTACK_SECRET_KEY" true
check_env_var "JWT_EXPIRES_IN" false
check_env_var "CINETPAY_API_KEY" false
check_env_var "CINETPAY_SITE_ID" false

echo ""
echo "4. Vérification des conteneurs Docker..."

if docker ps --format '{{.Names}}' | grep -q "colisdirect-backend"; then
    echo -e "${GREEN}✓${NC} Conteneur backend en cours d'exécution"
    
    # Vérifier que JWT_SECRET est défini dans le conteneur
    JWT_IN_CONTAINER=$(docker exec colisdirect-backend printenv JWT_SECRET 2>/dev/null || echo "")
    if [ -z "$JWT_IN_CONTAINER" ]; then
        echo -e "${RED}✗${NC} JWT_SECRET n'est pas défini dans le conteneur backend !"
        ((ERRORS++))
    else
        echo -e "${GREEN}✓${NC} JWT_SECRET est défini dans le conteneur"
        
        # Vérifier qu'il correspond au fichier .env
        JWT_IN_FILE=$(grep "^COLISDIRECT_JWT_SECRET=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
        if [ "$JWT_IN_CONTAINER" != "$JWT_IN_FILE" ]; then
            echo -e "${YELLOW}⚠${NC} JWT_SECRET dans le conteneur diffère du fichier .env.production"
            echo "   Vous devrez peut-être rebuild le conteneur"
            ((WARNINGS++))
        fi
    fi
else
    echo -e "${YELLOW}⚠${NC} Conteneur backend non trouvé (normal si pas encore démarré)"
fi

if docker ps --format '{{.Names}}' | grep -q "colisdirect-frontend"; then
    echo -e "${GREEN}✓${NC} Conteneur frontend en cours d'exécution"
else
    echo -e "${YELLOW}⚠${NC} Conteneur frontend non trouvé (normal si pas encore démarré)"
fi

echo ""
echo "5. Vérification de la connectivité..."

if docker ps --format '{{.Names}}' | grep -q "colisdirect-backend"; then
    # Vérifier si le backend répond
    if docker exec colisdirect-backend curl -sf http://localhost:3001/health >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Backend répond sur /health"
    else
        echo -e "${YELLOW}⚠${NC} Backend ne répond pas sur /health (peut être normal si le service démarre)"
    fi
fi

echo ""
echo "=========================================="
echo "Résumé"
echo "=========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Configuration OK !"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠${NC} Configuration valide avec $WARNINGS avertissement(s)"
    echo "Vérifiez les avertissements ci-dessus."
    exit 0
else
    echo -e "${RED}✗${NC} Configuration invalide : $ERRORS erreur(s), $WARNINGS avertissement(s)"
    echo ""
    echo "Corrigez les erreurs avant de continuer."
    exit 1
fi

