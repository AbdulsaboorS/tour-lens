// The property's own records. Everything the agent states as fact comes from here.

export type VisualCheck = {
  key: string;
  question: string;
  expected: boolean;
  claim: string;
  /** The fact this check verifies, withheld from the agent when the camera contradicts it. */
  fact: string;
};

export type PropertyRecord = {
  id: string;
  title: string;
  /** What the answer card shows when this record answers the question. */
  gist: string;
  source: string;
  about: string;
  facts: string[];
  checks?: VisualCheck[];
};

export const building = {
  name: "Larkspur Commons",
  address: "1180 Alder Row, Riverton",
  tourUnit: "4B",
};

export const records: PropertyRecord[] = [
  {
    id: "washer.spec",
    title: "In-unit laundry",
    gist: "Top-load washer, 4.5 cu ft",
    source: "Unit 4B spec sheet, Aug 2026",
    about: "the washer, dryer or laundry area in unit 4B: type, capacity, repairs",
    facts: [
      "Top-load washer, 4.5 cu ft, with a matching dryer, installed 2023.",
      "Washer repairs are covered by maintenance, same week.",
    ],
    checks: [
      {
        key: "washer_front_load",
        question: "Washing machine in frame: true if it loads from the front through a round door, false if it loads from a lid on top.",
        expected: false,
        claim: "The spec sheet lists a top-load washer.",
        fact: "Top-load washer, 4.5 cu ft, with a matching dryer, installed 2023.",
      },
    ],
  },
  {
    id: "washer.policy",
    title: "Laundry rules",
    gist: "Pods OK, HE detergent only",
    source: "Resident handbook, section 6",
    about: "what detergent can be used, pods, quiet hours for laundry",
    facts: [
      "HE detergent only. Pods are fine.",
      "Laundry quiet hours are 10pm to 7am.",
    ],
  },
  {
    id: "window.view",
    title: "Unit 4B view and light",
    gist: "East courtyard view, morning sun",
    source: "Unit 4B spec sheet, Aug 2026",
    about: "what the window in unit 4B looks out on, which way it faces, sunlight, blinds",
    facts: [
      "Fourth floor, east facing, over the courtyard garden.",
      "Direct sun from about 7am to 11am.",
      "Double-pane windows with blackout roller shades included.",
    ],
  },
  {
    id: "units.compare_view",
    title: "Other available units",
    gist: "7A has a skyline view",
    source: "Availability report, Oct 13 2026",
    about: "other open units to compare against 4B, better views, prices, move-in dates",
    facts: [
      "Unit 4B: 1 bed, 712 sq ft, $2,150 per month, available Nov 1.",
      "Unit 7A: same floor plan, seventh floor, west facing with a downtown skyline view, $2,290 per month, available Nov 15.",
      "Unit 2C: same floor plan, second floor, faces the street, $2,045 per month, available now.",
    ],
  },
  {
    id: "living_room.dimensions",
    title: "Living room measurements",
    gist: "14 ft 2 in by 12 ft 8 in",
    source: "Floor plan A1, rev 3",
    about: "living room size, wall lengths, how much furniture the room holds",
    facts: [
      "Living room is 14 ft 2 in by 12 ft 8 in.",
      "The longest open wall, opposite the window, is 11 ft 6 in.",
    ],
  },
  {
    id: "unit.staging",
    title: "Model unit staging",
    gist: "Staging only, not included",
    source: "Leasing policy, section 4",
    about: "whether the couch, desk or other furniture in the unit comes with it, furnished or unfurnished",
    facts: [
      "4B is staged as a model unit. The couch, desk and decor are staging and don't come with it.",
      "The unit leases unfurnished. A furnished package is available for $250 per month.",
    ],
  },
  {
    id: "internet.service",
    title: "Internet",
    gist: "1 Gbps fiber, desk nook fits 5 ft",
    source: "Amenity sheet, 2026",
    about: "internet speed, wifi, working from home, where a desk or computer setup could go, ethernet",
    facts: [
      "Bayline Fiber, 1 Gbps up and down, included in the $95 monthly amenity fee.",
      "Router is preinstalled in the hall closet. Ethernet jacks in the living room and bedroom.",
      "The desk nook by the bedroom window fits a desk up to 5 ft wide, with two outlets.",
      "Coworking lounge on floor 1 with bookable call rooms.",
    ],
  },
  {
    id: "unit.pricing",
    title: "Rent and fees",
    gist: "$2,150 a month, 12-month lease",
    source: "Unit 4B pricing, Oct 13 2026",
    about: "rent, deposit, fees, utilities, lease length for unit 4B",
    facts: [
      "Rent is $2,150 per month on a 12-month lease.",
      "Security deposit is $500. Application fee is $45.",
      "Amenity fee is $95 per month and covers internet and trash. Electric is separate.",
    ],
  },
  {
    id: "unit.hold",
    title: "Holding a unit",
    gist: "Free 48-hour hold, no deposit",
    source: "Leasing policy, section 2",
    about: "holding or reserving unit 4B, taking it off the market, next steps to apply",
    facts: [
      "A free 48-hour hold takes the unit off the market while you apply.",
      "No deposit is charged for the hold.",
    ],
  },
];
