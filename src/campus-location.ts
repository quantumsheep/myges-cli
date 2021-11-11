const campusLocations = {
  NATION1: ['242 rue du Faubourg Saint Antoine, 75012 Paris', undefined],
  NATION2: ['220 rue du Faubourg Saint Antoine, 75012 Paris', '2'],
  VOLTAIRE1: ['1 rue Bouvier, 75011 Paris', '5'],
  VOLTAIRE2: ['20 rue Bouvier, 75011 Paris', '5'],
  ERARD: ['19-21 rue Erard, 75011 Paris', '4'],
  BEAUGRENELLE: ['35 quai André Citroen 75015 Paris', '1'],
  MONTSOURIS: ['5 rue Lemaignan, 75014 Paris', '3'],
  MONTROUGE: ['11 rue Camille Pelletan, 92120 Montrouge', '6'],
  JOURDAN: ['6-10 bd Jourdan 75014 Paris', '7'],
  VAUGIRARD: ['273-277 rue de Vaugirard, 75012 Paris', '9'],
  'MAIN-D-OR': ['8‐14 Passage de la Main d’Or 75011 Paris', '8'],
};

export function getCampusLocation(key: string): string[] {
  return campusLocations[key] ?? [undefined, '11'];
}
