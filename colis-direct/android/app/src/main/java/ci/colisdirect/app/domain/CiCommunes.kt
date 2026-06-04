package ci.colisdirect.app.domain

/** Communes CI — aligné web / maquette */
object CiCommunes {
    val all: List<String> = listOf(
        "Abengourou", "Abobo", "Aboisso", "Adiaké", "Adjamé", "Adzopé", "Agboville", "Agnibilékrou",
        "Akoupé", "Alépé", "Angovia", "Anyama", "Arrah", "Attécoubé", "Attiégouakro", "Ayamé", "Azaguié",
        "Bangolo", "Béoumi", "Bettié", "Biankouma", "Bingerville", "Blolequin", "Bocanda", "Bondoukou",
        "Bongouanou", "Bonon", "Booko", "Botro", "Bouaflé", "Bouaké", "Bouna", "Boundiali", "Brobo", "Buyo",
        "Cechi", "Cocody", "Dabakala", "Dabou", "Daloa", "Danané", "Daoukro", "Dianra", "Didiévi", "Dikodougou",
        "Dimbokro", "Divo", "Djékanou", "Doropo", "Duékoué", "Facobly", "Ferkessédougou", "Fresco", "Gabiadji",
        "Gagnoa", "Gbéléban", "Gbon", "Grabo", "Grand-Bassam", "Grand-Béréby", "Grand-Lahou", "Gueyo",
        "Guiberoua", "Guiglo", "Guitry", "Hiré", "Issia", "Jacqueville", "Kaniasso", "Katiola", "Kombolokoura",
        "Kong", "Koonan", "Korhogo", "Kouassi-Kouassikro", "Kouibly", "Koumassi", "Koun-Fao", "Kounahiri",
        "Kouto", "Lakota", "Langbonou", "Lopou", "M'batto", "M'bengué", "Madinani", "Maféré", "Man", "Mankono",
        "Marcory", "Méagui", "Minignan", "Monogaga", "Morondo", "Nassian", "Niablé", "Niakara", "Niakaramadougou",
        "Niellé", "Noé", "Odienné", "Ouangolodougou", "Ouaninou", "Ouellé", "Oumé", "Ouragahio", "Plateau",
        "Port-Bouët", "Prikro", "Rubino", "Sakassou", "Samatiguila", "San-Pédro", "Sandégué", "Sassandra",
        "Séguéla", "Séguélon", "Sikensi", "Sinématiali", "Sipilou", "Songon", "Soubré", "Taabo", "Tabou",
        "Taï", "Tanda", "Téhini", "Tiapoum", "Tiassalé", "Tiébissou", "Tienie", "Tingrela", "Touba",
        "Toulépleu", "Toumodi", "Treichville", "Vavoua", "Worofla", "Yakassé-Attobrou", "Yamoussoukro",
        "Yopougon", "Zaranou", "Zouan-Hounien", "Zoukougbeu", "Zuenoula",
    ).sorted()

    fun optionsFor(selected: String?): List<String> {
        if (selected.isNullOrBlank() || selected in all) return all
        return listOf(selected) + all
    }
}
