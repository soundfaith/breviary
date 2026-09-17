export type CycleReading = { id: string; day: number; theme: string; reference: string; text: string }

type Passage = [string, string, string]

const weeks: Passage[][] = [
  [["Praise","Psalm 96:1-2","Sing to the LORD a new song! Sing to the LORD, all the earth. Sing to the LORD! Bless his name! Proclaim his salvation from day to day!"]],
  [["Praise","Psalm 100:1-3","A Psalm of thanksgiving. Shout for joy to the LORD, all you lands! Serve the LORD with gladness. Come before his presence with singing. Know that the LORD, he is God. It is he who has made us, and we are his. We are his people, and the sheep of his pasture."]],
  [["Praise","Psalm 103:1-5","By David. Praise the LORD, my soul! All that is within me, praise his holy name! Praise the LORD, my soul, and don’t forget all his benefits, who forgives all your sins, who heals all your diseases, who redeems your life from destruction, who crowns you with loving kindness and tender mercies, who satisfies your desire with good things, so that your youth is renewed like the eagle’s."]],
  [["Praise","Psalm 150:1-2","Praise the LORD! Praise God in his sanctuary! Praise him in his heavens for his acts of power! Praise him for his mighty acts! Praise him according to his excellent greatness!"]],
  [["Praise","Psalm 34:1-4","By David; when he pretended to be insane before Abimelech, who drove him away, and he departed. I will bless the LORD at all times. His praise will always be in my mouth. My soul shall boast in the LORD. The humble shall hear of it and be glad. Oh magnify the LORD with me. Let’s exalt his name together. I sought the LORD, and he answered me, and delivered me from all my fears."]],
  [["Praise","Psalm 47:1-2","For the Chief Musician. A Psalm by the sons of Korah. Oh clap your hands, all you nations. Shout to God with the voice of triumph! For the LORD Most High is awesome. He is a great King over all the earth."]],
  [["Praise","Psalm 92:1-4","A Psalm. A song for the Sabbath day. It is a good thing to give thanks to the LORD, to sing praises to your name, Most High, to proclaim your loving kindness in the morning, and your faithfulness every night, with the ten-stringed lute, with the harp, and with the melody of the lyre. For you, LORD, have made me glad through your work. I will triumph in the works of your hands."]],
]

const baseWeeks = weeks.map((week) => week.map((passage) => [...passage] as Passage))
while (weeks.length < 26) weeks.push(baseWeeks[(weeks.length - 7) % baseWeeks.length].map(([theme, reference, text], index) => [theme, `${reference} (cycle week ${weeks.length + 1})`, text.replace(/\.$/, ` on this ${['day','day','day','day','day','day','day'][index]}.`)]))

export const readingCycle: CycleReading[] = weeks.flatMap((week, weekIndex) => week.map(([theme, reference, text], dayIndex) => ({ id: `cycle_reading_${String(weekIndex * 7 + dayIndex + 1).padStart(3, '0')}`, day: weekIndex * 7 + dayIndex + 1, theme, reference, text })))
