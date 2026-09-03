type Reflection = { day: number; source: 'psalm'; text: string }

const repeatedPsalmNumbers = [1, 8, 16, 19, 22, 23, 27, 32, 34, 40, 42, 46, 51, 63, 67, 84, 90, 91, 95, 100, 103, 104, 119, 121, 126, 127, 130, 136, 138, 143, 146, 147]
const themes: Record<number, string> = {
  1: 'Let God’s wisdom become the quiet measure of your choices today. Carry one faithful decision into the next ordinary task.',
  8: 'Receive your dignity as a gift, and let it widen your care for every creature. Treat the people you meet as bearers of God’s image.',
  16: 'Bring your anxieties into God’s presence and wait for his faithful answer. Trust can grow even before circumstances change.',
  19: 'Allow creation’s praise to awaken gratitude in the ordinary moments of this day. Let beauty return your attention to its Maker.',
  22: 'When prayer feels abandoned, remain honest before God; trust can begin in that cry. Let the Shepherd meet you where you are.',
  23: 'Rest in the Shepherd who leads you gently through both abundance and uncertainty. Receive today’s provision without borrowing tomorrow’s fear.',
  27: 'Courage grows when you seek God’s face before you measure the difficulty ahead. Let one act of brave love answer fear today.',
  32: 'Confession is not defeat; it is the doorway through which mercy restores the heart. Step through it without hiding from God’s kindness.',
  34: 'Taste the goodness of the Lord by noticing one mercy you might otherwise overlook. Share that mercy through a patient word.',
  40: 'Offer God your readiness today, especially in the small acts of patience and service. Your willingness is already a form of prayer.',
  42: 'Let your longing for God become prayer rather than a reason for discouragement. The thirst itself is evidence that grace is drawing you.',
  46: 'Be still long enough to remember that God remains your refuge beneath every change. Let that steadiness shape the way you respond to others.',
  51: 'Ask for a clean heart, and let repentance become a hopeful return rather than self-condemnation. God’s mercy is larger than your failure.',
  63: 'Seek God before the day fills; desire itself can become an offering of love. Give him your first attention, even if only for a moment.',
  67: 'Look for the ways blessing is already moving through your home, work, and relationships. Become a channel of that blessing for someone else.',
  84: 'Make room for holy desire, trusting that even a small step toward God is precious. Let your choices today turn your heart toward home in him.',
  90: 'Number your days with wisdom by giving today’s duties the attention and love they deserve. A finite day can still hold eternal meaning.',
  91: 'Under God’s shelter, meet fear with steady trust and extend that shelter to someone vulnerable. Security becomes holy when it makes us generous.',
  95: 'Listen for God’s voice before habit hardens your heart; worship can renew your attention. Let obedience begin with the next clear invitation.',
  100: 'Serve with gladness, remembering that gratitude changes the spirit of even humble work. Let joy become a quiet witness to God’s goodness.',
  103: 'Let mercy shape your view of yourself and make you patient with the weakness of others. God remembers that we are dust and still calls us beloved.',
  104: 'Receive the living world as a gift and answer its beauty with responsible care. Praise becomes credible when it changes how we live.',
  119: 'Let one faithful word guide your next decision, especially when the path feels unclear. Scripture becomes a lamp through repeated, patient practice.',
  121: 'Lift your eyes with confidence: help may be quiet, but God’s keeping does not sleep. Walk into this day held, not hurried.',
  126: 'Trust that patient sowing matters; love offered in tears can still become a harvest of joy. Keep doing the good that cannot yet be measured.',
  127: 'Release the illusion that everything depends on you, and let God establish your work. Rest is an act of trust, not wasted time.',
  130: 'Wait for the Lord without pretending; hope grows in the honest depths of prayer. Watch for mercy with the patience of one who knows dawn is coming.',
  136: 'Remember God’s enduring mercy in your own story, and let remembrance become praise. Recalling grace can strengthen you for today’s trial.',
  138: 'You are fully known and still held by God; carry that freedom into your relationships today. Speak truth without fear and receive others with mercy.',
  143: 'Ask God to teach you his way, then practice the next faithful step you already know. Guidance often arrives as humble obedience.',
  146: 'Place your hope in the God who lifts the bowed down and notices those left unseen. Make room today for someone who needs to be noticed.',
  147: 'Praise God for gathering what is scattered, within your own heart and among his people. Let your words help make peace where there is distance.',
}

const fallback = 'Let this psalm gather your attention and turn it toward God. Carry one line of prayer into the next ordinary task.'

export const reflections: Reflection[] = Array.from({ length: 182 }, (_, index) => {
  const psalmNumber = index < 150 ? index + 1 : repeatedPsalmNumbers[index - 150]
  return { day: index + 1, source: 'psalm', text: themes[psalmNumber] ?? fallback }
})
