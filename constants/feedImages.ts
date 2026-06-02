const U = (id: string, w = 800, h = 480) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;

const FOOD = [
  U('photo-1504754524776-8f4f37790ca0'),
  U('photo-1555939594-58d7cb561ad1'),
  U('photo-1476224203421-9ac39bcb3327'),
  U('photo-1565299624946-b28f40a0ae38'),
  U('photo-1540189549336-e6e99c3679fe'),
];

const CAFE = [
  U('photo-1453614512568-c4024d13c247'),
  U('photo-1509042239860-f550ce710b93'),
  U('photo-1511920170033-f8396924c348'),
  U('photo-1447933601403-0c6688de566e'),
];

const FITNESS = [
  U('photo-1534438327276-14e5300c3a48'),
  U('photo-1517836357463-d25dfeac3438'),
  U('photo-1571902943202-507ec2618e8f'),
  U('photo-1549060279-7e168fcee0c2'),
];

const WELLNESS = [
  U('photo-1540555700478-4be289fbecef'),
  U('photo-1544161515-4ab6ce6db874'),
  U('photo-1600334129128-685c5582fd35'),
  U('photo-1571019613454-1cb2f99b2d8b'),
];

const FASHION = [
  U('photo-1441986300917-64674bd600d8'),
  U('photo-1483985988355-763728e1935b'),
  U('photo-1529139574466-a303027c1d8b'),
  U('photo-1525507119028-ed4c629a60a3'),
];

const EVENTS = [
  U('photo-1514525253161-7a46d19cd819'),
  U('photo-1533174072545-7a4b6ad7a6a3'),
  U('photo-1492684223066-81342ee5ff30'),
  U('photo-1506157786151-b8491531f063'),
];

const TECH = [
  U('photo-1518770660439-4636190af475'),
  U('photo-1519389950473-47ba0277781c'),
  U('photo-1531297484001-80022131f5a1'),
];

const BEAUTY = [
  U('photo-1560066984-138dadb4c035'),
  U('photo-1522337360788-8b13dee7a37e'),
  U('photo-1487412947147-5cebf100ffc2'),
];

const RETAIL = [
  U('photo-1481437156560-3205f6a55735'),
  U('photo-1555529669-e69e7aa0ba9a'),
  U('photo-1567401893414-76b7b1e5a7a5'),
];

const DEFAULT_POOL = [
  U('photo-1519677100203-a0e668c92439'),
  U('photo-1498050108023-c5249f4df085'),
  U('photo-1498837167922-ddd27525d352'),
];

const POOLS: Record<string, string[]> = {
  food: FOOD,
  restaurant: FOOD,
  cafe: CAFE,
  coffee: CAFE,
  cafes: CAFE,
  'cafés': CAFE,
  fitness: FITNESS,
  gym: FITNESS,
  wellness: WELLNESS,
  spa: WELLNESS,
  beauty: BEAUTY,
  fashion: FASHION,
  retail: FASHION,
  events: EVENTS,
  event: EVENTS,
  music: EVENTS,
  tech: TECH,
  trending: DEFAULT_POOL,
};

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function pickFeedImage(id: string, hints: (string | undefined | null)[]): string {
  const joined = hints.filter(Boolean).join(' ').toLowerCase();
  let pool: string[] = DEFAULT_POOL;
  for (const key of Object.keys(POOLS)) {
    if (joined.includes(key)) {
      pool = POOLS[key];
      break;
    }
  }
  const idx = hashId(id) % pool.length;
  return pool[idx];
}
