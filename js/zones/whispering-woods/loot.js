// js/zones/whispering-woods/loot.js - Zone materials and refinement crafting recipes for Whispering Woods.

export const WHISPERING_WOODS_LOOT = {
  materials: {
    ancient_heartwood: { id: 'ancient_heartwood', name: 'Ancient Heartwood', price: 80, rarity: 'rare' },
    chieftain_crest:   { id: 'chieftain_crest', name: 'Chieftain Crest', price: 120, rarity: 'rare' },
    verdant_essence:   { id: 'verdant_essence', name: 'Verdant Essence', price: 50, rarity: 'uncommon' },
  },
  recipes: [
    {
      id: 'craft_verdant_guard',
      name: 'Verdant Guard',
      type: 'armor',
      costZeny: 250,
      reqMaterials: [
        { id: 'ancient_heartwood', count: 2 },
        { id: 'wolf_pelt', count: 5 }
      ],
      result: { id: 'leather_vest', refine: 1 }
    }
  ]
};
