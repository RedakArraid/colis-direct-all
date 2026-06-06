import { useState, useEffect } from 'react';
import { Trash2, Package, ShoppingCart, CreditCard, Plus, ArrowLeft, Smartphone, CheckSquare, Square, ChevronDown, ChevronUp, MapPin, User } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { resolvePaymentEmail, sanitizeOptionalEmail } from '../utils/paymentEmail';

interface CartPageProps {
  onNavigate: (page: string) => void;
}

function CartPage({ onNavigate }: CartPageProps) {
  const { user } = useAuth();
  const { items, removeFromCart, clearCart, getTotalPrice } = useCart();
  const [loading, setLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'paystack' | 'relay_cash' | null>(null);
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());
  // deselectedItems tracks items the user manually unchecked — all items selected by default
  const [deselectedItems, setDeselectedItems] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [relayNames, setRelayNames] = useState<Record<string, string>>({});

  const isItemPromoFree = (item: (typeof items)[0]) => item.paymentOptions.promoFree === true;

  // Derived selection state
  const selectedItemsList = items.filter(i => !deselectedItems.has(i.id));
  const allSelected = selectedItemsList.length === items.length && items.length > 0;
  const someSelected = selectedItemsList.length > 0;

  const selectedEffectiveTotal = selectedItemsList.reduce(
    (sum, item) => sum + (isItemPromoFree(item) ? 0 : item.totalPrice),
    0
  );
  const totalPrice = getTotalPrice();

  const toggleItem = (id: string) => {
    setDeselectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setDeselectedItems(new Set(items.map(i => i.id)));
    } else {
      setDeselectedItems(new Set());
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const ids = [...new Set(
      items.flatMap(i => [i.pickupRelayId, i.deliveryRelayId]).filter((id): id is string => !!id)
    )];
    if (!ids.length) return;
    Promise.all(ids.map(id => api.getRelayPoint(id).then(({ data }) => [id, (data as any)?.name || ''] as [string, string])))
      .then(pairs => setRelayNames(Object.fromEntries(pairs.filter(([, name]) => name))))
      .catch(() => {});
  }, [items.length]);

  const handleRemoveItem = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir retirer cet envoi du panier ?')) {
      removeFromCart(id);
      setDeselectedItems(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const baseShipmentPayload = (item: (typeof items)[0], trackingNumber: string, pay: { price: number; printing: number; box: number; total: number; promoFree: boolean; method: 'paystack' | 'relay_cash' | null }) => ({
    tracking_number: trackingNumber,
    sender_first_name: item.formData.sender_first_name,
    sender_last_name: item.formData.sender_last_name,
    sender_email: sanitizeOptionalEmail(item.formData.sender_email),
    sender_phone: item.formData.sender_phone,
    sender_commune: item.formData.sender_commune,
    sender_quartier: item.formData.sender_quartier,
    sender_address: item.formData.sender_address,
    recipient_first_name: item.formData.recipient_first_name,
    recipient_last_name: item.formData.recipient_last_name,
    recipient_email: sanitizeOptionalEmail(item.formData.recipient_email),
    recipient_phone: item.formData.recipient_phone,
    recipient_commune: item.formData.recipient_commune,
    recipient_quartier: item.formData.recipient_quartier,
    recipient_address: item.formData.recipient_address,
    package_type: item.formData.package_type,
    weight: item.formData.weight,
    price: pay.promoFree ? 0 : pay.price,
    printing_fee: pay.promoFree ? 0 : pay.printing,
    assistance_fee: 0,
    box_price: pay.promoFree ? 0 : pay.box,
    current_status: 'READY_FOR_DROP_OFF' as const,
    payment_status: 'pending' as const,
    print_at_relay: item.paymentOptions.printOption === 'relay',
    relay_assisted: false,
    home_delivery: item.formData.home_delivery || false,
    pickup_method: item.formData.pickup_method,
    payment_method: pay.promoFree ? null : pay.method,
    origin_relay_id: item.pickupRelayId || null,
    destination_relay_id: item.deliveryRelayId || null,
    promo_code: pay.promoFree && item.paymentOptions.promoCode ? item.paymentOptions.promoCode : undefined,
  });

  const handlePayment = async () => {
    if (!someSelected) {
      alert('Veuillez sélectionner au moins un envoi à régler.');
      return;
    }

    let paymentMethod = selectedPaymentMethod;
    if (selectedEffectiveTotal === 0) {
      paymentMethod = null;
    } else if (!paymentMethod) {
      alert('Veuillez sélectionner un moyen de paiement');
      return;
    }

    // Paiement groupé Mobile Money pour plusieurs colis sélectionnés
    if (selectedEffectiveTotal > 0 && paymentMethod === 'paystack' && selectedItemsList.length > 1) {
      setLoading(true);
      try {
        const createdTrackingNumbers: string[] = [];
        const failedCreations: string[] = [];

        for (const item of selectedItemsList) {
          try {
            const trackingNumber =
              'CD' + Date.now().toString().slice(-8) + Math.random().toString(36).substring(2, 6).toUpperCase();
            const promoFree = isItemPromoFree(item);
            const { error } = await api.createShipment({
              ...baseShipmentPayload(item, trackingNumber, {
                price: item.price,
                printing: item.printingFee,
                box: item.boxPrice,
                total: promoFree ? 0 : item.totalPrice,
                promoFree,
                method: promoFree ? null : 'paystack',
              }),
              payment_status: 'pending',
            });
            if (error) failedCreations.push(item.id);
            else createdTrackingNumbers.push(trackingNumber);
          } catch {
            failedCreations.push(item.id);
          }
        }

        if (createdTrackingNumbers.length === 0) {
          alert('Impossible de créer les envois. Veuillez réessayer.');
          setLoading(false);
          return;
        }

        const customer = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Client';
        const { data: batchData, error: batchErr } = await api.initBatchMobileMoneyPayment({
          tracking_numbers: createdTrackingNumbers,
          customer_name: customer,
          customer_email: resolvePaymentEmail(user?.email),
          customer_phone: user?.phone || selectedItemsList[0]?.formData?.sender_phone || '',
        });

        if (batchErr || !batchData?.payment_url) {
          alert(batchErr || 'Impossible d\'initier le paiement groupé. Veuillez réessayer.');
          setLoading(false);
          return;
        }

        // Retirer du panier uniquement les items créés avec succès
        createdTrackingNumbers.forEach(() => {});
        selectedItemsList
          .filter(i => !failedCreations.includes(i.id))
          .forEach(i => removeFromCart(i.id));

        window.location.href = batchData.payment_url;
        return;
      } catch (err: any) {
        alert(err.message || 'Erreur lors du paiement groupé.');
        setLoading(false);
        return;
      }
    }

    // Traitement individuel (relay_cash, promo, ou paystack 1 seul colis)
    setLoading(true);
    const successfulItems: string[] = [];
    const failedItems: string[] = [];

    try {
      for (const item of selectedItemsList) {
        try {
          setProcessingItems(prev => new Set(prev).add(item.id));

          const trackingNumber =
            'CD' + Date.now().toString().slice(-8) + Math.random().toString(36).substring(2, 6).toUpperCase();
          const promoFree = isItemPromoFree(item);
          const itemTotalPrice = promoFree ? 0 : item.totalPrice;

          if (promoFree || paymentMethod === null) {
            const { error } = await api.createShipment({
              ...baseShipmentPayload(item, trackingNumber, {
                price: item.price,
                printing: item.printingFee,
                box: item.boxPrice,
                total: 0,
                promoFree: true,
                method: null,
              }),
              payment_status: 'paid',
            });
            if (error) throw new Error(error);
            successfulItems.push(item.id);
          } else if (paymentMethod === 'relay_cash') {
            const { error } = await api.createShipment({
              ...baseShipmentPayload(item, trackingNumber, {
                price: item.price,
                printing: item.printingFee,
                box: item.boxPrice,
                total: itemTotalPrice,
                promoFree: false,
                method: 'relay_cash',
              }),
            });
            if (error) throw new Error(error);
            successfulItems.push(item.id);
          } else if (paymentMethod === 'paystack') {
            // 1 seul colis sélectionné avec paystack → paiement individuel
            const { data, error } = await api.createShipment({
              ...baseShipmentPayload(item, trackingNumber, {
                price: item.price,
                printing: item.printingFee,
                box: item.boxPrice,
                total: itemTotalPrice,
                promoFree: false,
                method: 'paystack',
              }),
            });
            if (error) throw new Error(error);
            const resolvedTracking = (data as any)?.tracking_number || trackingNumber;

            const { data: payData, error: payErr } = await api.initMobileMoneyPayment({
              tracking_number: resolvedTracking,
              amount_fcfa: itemTotalPrice,
              customer_name: `${item.formData.sender_first_name} ${item.formData.sender_last_name}`.trim(),
              customer_email: resolvePaymentEmail(item.formData.sender_email || user?.email),
              customer_phone: item.formData.sender_phone,
            });
            if (payErr || !payData?.payment_url) {
              throw new Error(payErr || 'Impossible d\'obtenir le lien de paiement');
            }
            sessionStorage.setItem('last_payment_tracking', resolvedTracking);
            removeFromCart(item.id);
            window.location.href = payData.payment_url;
            return;
          }
        } catch (error: any) {
          console.error(`Error processing item ${item.id}:`, error);
          failedItems.push(item.id);
        } finally {
          setProcessingItems(prev => { const next = new Set(prev); next.delete(item.id); return next; });
        }
      }

      successfulItems.forEach(id => removeFromCart(id));

      if (failedItems.length > 0) {
        alert(`${failedItems.length} envoi(s) n'ont pas pu être créés. Les autres ont été traités avec succès.`);
      } else if (successfulItems.length > 0) {
        alert('Tous les envois ont été créés avec succès !');
        onNavigate('my-shipments');
      }
    } catch (error: any) {
      alert(`Erreur lors du paiement: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="card p-10 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-[#E6E6E6]" />
            <h2 className="text-2xl font-extrabold text-[#1A1A1A] mb-2">Votre panier est vide</h2>
            <p className="text-[#6B7280] mb-6">Ajoutez des envois à votre panier pour continuer</p>
            <button
              onClick={() => onNavigate('create-shipment')}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Créer un envoi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] py-6 sm:py-8 px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-1.5 text-[#6B7280] hover:text-[#FF6C00] transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
            <h1 className="text-2xl font-extrabold text-[#1A1A1A] tracking-tight">Mon panier</h1>
            <span className="text-sm text-[#6B7280]">({items.length} {items.length > 1 ? 'envois' : 'envoi'})</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-sm text-[#FF6C00] hover:text-[#E66100] transition-colors font-semibold"
            >
              {allSelected
                ? <CheckSquare className="w-4 h-4" />
                : <Square className="w-4 h-4" />
              }
              {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
            <button
              onClick={() => { if (confirm('Êtes-vous sûr de vouloir vider votre panier ?')) clearCart(); }}
              className="text-sm text-red-600 hover:text-red-700 font-semibold"
            >
              Vider le panier
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {items.map((item) => {
              const promoFree = isItemPromoFree(item);
              const itemTotalPrice = promoFree ? 0 : item.totalPrice;
              const isProcessing = processingItems.has(item.id);
              const isSelected = !deselectedItems.has(item.id);

              const isExpanded = expandedItems.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`card p-5 sm:p-6 border-2 transition-colors ${
                    isSelected ? 'border-[#FF6C00]' : 'border-[#E6E6E6]'
                  } ${isProcessing ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      {/* Checkbox sélection */}
                      <button
                        onClick={() => toggleItem(item.id)}
                        disabled={isProcessing}
                        className="flex-shrink-0 text-[#FF6C00] disabled:opacity-50"
                      >
                        {isSelected
                          ? <CheckSquare className="w-5 h-5" />
                          : <Square className="w-5 h-5 text-gray-400" />
                        }
                      </button>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FF6C00] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm sm:text-base text-[#1A1A1A] truncate">
                          {item.formData.recipient_first_name} {item.formData.recipient_last_name}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#6B7280] truncate">
                          {item.formData.recipient_commune}, {item.formData.recipient_quartier}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <button
                        onClick={() => toggleExpand(item.id)}
                        disabled={isProcessing}
                        className="p-1 text-[#9CA3AF] hover:text-[#3A3A3A] disabled:opacity-50"
                        title={isExpanded ? 'Masquer les détails' : 'Voir les détails'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={isProcessing}
                        className="text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm mb-3 sm:mb-4">
                    <div>
                      <span className="text-[#6B7280]">Type:</span>
                      <span className="ml-2 font-medium">
                        {item.formData.grid_type === 'courier' ? 'Courrier' : 'Colis'}{item.formData.grid_type !== 'courier' && item.formData.package_type ? ` (${item.formData.package_type === 'petit' ? 'Petit' : item.formData.package_type === 'moyen' ? 'Moyen' : 'Grand'})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B7280]">Poids:</span>
                      <span className="ml-2 font-medium">{item.formData.weight} kg</span>
                    </div>
                    {item.printingFee > 0 && (
                      <div>
                        <span className="text-[#6B7280]">Impression au relais:</span>
                        <span className="ml-2 font-medium">{item.printingFee} FCFA</span>
                      </div>
                    )}
                    {item.boxPrice > 0 && (
                      <div>
                        <span className="text-[#6B7280]">Carton d'expédition:</span>
                        <span className="ml-2 font-medium">{item.boxPrice} FCFA</span>
                      </div>
                    )}
                  </div>

                  {/* Détails dépliables */}
                  {isExpanded && (
                    <div className="mb-3 sm:mb-4 border-t pt-3 sm:pt-4 space-y-4 text-xs sm:text-sm">
                      {/* Expéditeur */}
                      <div>
                        <p className="font-bold text-[#3A3A3A] flex items-center gap-1 mb-2">
                          <User className="w-3.5 h-3.5" /> Expéditeur
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[#6B7280] pl-5">
                          <div><span className="font-medium text-[#1A1A1A]">{item.formData.sender_first_name} {item.formData.sender_last_name}</span></div>
                          <div>{item.formData.sender_phone}</div>
                          {item.formData.sender_commune && <div>{item.formData.sender_commune}{item.formData.sender_quartier ? `, ${item.formData.sender_quartier}` : ''}</div>}
                          {item.formData.sender_address && <div className="sm:col-span-2 text-[#6B7280]">{item.formData.sender_address}</div>}
                        </div>
                      </div>

                      {/* Destinataire */}
                      <div>
                        <p className="font-bold text-[#3A3A3A] flex items-center gap-1 mb-2">
                          <User className="w-3.5 h-3.5" /> Destinataire
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[#6B7280] pl-5">
                          <div><span className="font-medium text-[#1A1A1A]">{item.formData.recipient_first_name} {item.formData.recipient_last_name}</span></div>
                          <div>{item.formData.recipient_phone}</div>
                          {item.formData.recipient_commune && <div>{item.formData.recipient_commune}{item.formData.recipient_quartier ? `, ${item.formData.recipient_quartier}` : ''}</div>}
                          {item.formData.recipient_address && <div className="sm:col-span-2 text-[#6B7280]">{item.formData.recipient_address}</div>}
                        </div>
                      </div>

                      {/* Collecte & Livraison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="font-bold text-[#3A3A3A] flex items-center gap-1 mb-1">
                            <MapPin className="w-3.5 h-3.5" /> Collecte
                          </p>
                          <p className="text-[#6B7280] pl-5">
                            {item.formData.pickup_method === 'home_pickup' ? 'Ramassage à domicile' : 'Dépôt au point relais'}
                          </p>
                          {item.formData.pickup_method !== 'home_pickup' && item.pickupRelayId && (
                            <p className="text-[#6B7280] pl-5 mt-0.5">{relayNames[item.pickupRelayId] || `Relais #${item.pickupRelayId}`}</p>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-[#3A3A3A] flex items-center gap-1 mb-1">
                            <MapPin className="w-3.5 h-3.5" /> Livraison
                          </p>
                          <p className="text-[#6B7280] pl-5">
                            {item.formData.home_delivery ? 'Livraison à domicile' : 'Retrait en point relais'}
                          </p>
                          {!item.formData.home_delivery && item.deliveryRelayId && (
                            <p className="text-[#6B7280] pl-5 mt-0.5">{relayNames[item.deliveryRelayId] || `Relais #${item.deliveryRelayId}`}</p>
                          )}
                        </div>
                      </div>

                      {/* Options */}
                      {(item.formData.is_fragile || item.formData.is_insured) && (
                        <div className="flex gap-3">
                          {item.formData.is_fragile && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Fragile</span>
                          )}
                          {item.formData.is_insured && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Assuré</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {promoFree && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700">
                        <strong>Code promo {(item.paymentOptions.promoCode || 'appliqué').toUpperCase()}</strong> — Envoi gratuit
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-sm text-[#6B7280]">Total pour cet envoi:</span>
                    <span className="text-lg sm:text-xl font-bold text-[#FF6C00]">{itemTotalPrice} FCFA</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary & Payment */}
          <div className="lg:col-span-1">
            <div className="card p-5 sm:p-6 lg:sticky lg:top-4">
              <h2 className="text-base font-extrabold text-[#1A1A1A] mb-4">Récapitulatif</h2>

              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                <div className="flex justify-between text-xs sm:text-sm text-[#6B7280]">
                  <span>Total panier ({items.length} envoi{items.length > 1 ? 's' : ''}):</span>
                  <span>{totalPrice} FCFA</span>
                </div>
                {selectedItemsList.length < items.length && (
                  <div className="flex justify-between text-xs sm:text-sm text-blue-600">
                    <span>Sélectionnés ({selectedItemsList.length}):</span>
                    <span className="font-medium">{selectedEffectiveTotal} FCFA</span>
                  </div>
                )}
                <div className="border-t pt-2 sm:pt-3 flex justify-between font-bold text-base sm:text-lg">
                  <span>À payer ({selectedItemsList.length} envoi{selectedItemsList.length > 1 ? 's' : ''}):</span>
                  <span className="text-[#FF6C00]">{selectedEffectiveTotal} FCFA</span>
                </div>
              </div>

              {selectedEffectiveTotal > 0 && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-xs sm:text-sm font-semibold text-[#3A3A3A] mb-2 sm:mb-3">Moyen de paiement</h3>
                  <div className="space-y-2">
                    {[
                      { id: 'paystack' as const, label: 'Mobile Money (Orange Money, Wave, MTN, Moov) et Cartes Visa', Icon: Smartphone },
                      { id: 'relay_cash' as const, label: 'Paiement lors de la prise en charge (Espèces au point relais ou avec le transporteur)', Icon: Package },
                    ].map(({ id, label, Icon }) => (
                      <label
                        key={id}
                        className={`flex items-center p-2 sm:p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedPaymentMethod === id ? 'border-[#FF6C00] bg-orange-50' : 'border-[#E6E6E6] hover:border-[#E6E6E6]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={id}
                          checked={selectedPaymentMethod === id}
                          onChange={(e) => setSelectedPaymentMethod(e.target.value as typeof selectedPaymentMethod)}
                          className="w-3 h-3 sm:w-4 sm:h-4 text-[#FF6C00] focus:ring-[#FF6C00]"
                        />
                        <Icon className="ml-2 w-4 h-4 text-[#FF6C00] flex-shrink-0" />
                        <span className="ml-2 sm:ml-3 text-xs sm:text-sm font-medium">{label}</span>
                      </label>
                    ))}
                  </div>
                  {selectedPaymentMethod === 'paystack' && selectedItemsList.length > 1 && (
                    <p className="mt-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                      Paiement groupé — 1 seule transaction pour {selectedItemsList.length} envois
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={loading || !someSelected || (selectedEffectiveTotal > 0 && !selectedPaymentMethod)}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard className="w-4 h-4" />
                {loading
                  ? 'Traitement...'
                  : !someSelected
                  ? 'Sélectionnez des envois'
                  : selectedEffectiveTotal === 0
                  ? 'Valider gratuitement'
                  : `Payer ${selectedEffectiveTotal} FCFA`}
              </button>

              <button
                onClick={() => onNavigate('create-shipment')}
                className="btn-outline w-full mt-3 flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Ajouter un autre envoi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartPage;
