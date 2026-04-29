-- Ultra-short Kinyarwanda texts to match English/French length (30-40 words)
-- Execute against Supabase database

-- Chapter 0: What is menstruation?
UPDATE chapters
SET localized_narration = jsonb_set(
  localized_narration,
  '{rw}',
  '"Incurane ni imikorere ya buri kwezi. Itegura umubiri kwakira inda. Imara iminsi 21-35. Umwenda wa nyababyeyi urasohoka niba nta nda. Imisemburo igenzura byose."'::jsonb
)
WHERE "lessonId" = (SELECT id FROM lessons WHERE slug = 'your_cycle')
AND order_index = 0;

-- Chapter 1: The uterus and ovaries
UPDATE chapters
SET localized_narration = jsonb_set(
  localized_narration,
  '{rw}',
  '"Nyababyeyi ni urugingo rw''imikaya. Intangangore ebyiri zitanga intanga n''imisemburo. Imiyoboro ihuza intangangore na nyababyeyi. Mu ovulation, intanga irekurwa. Niba ihuye n''intanga ngabo, ishobora gusama."'::jsonb
)
WHERE "lessonId" = (SELECT id FROM lessons WHERE slug = 'your_cycle')
AND order_index = 1;

-- Chapter 2: The 4 phases
UPDATE chapters
SET localized_narration = jsonb_set(
  localized_narration,
  '{rw}',
  '"Icyiciro 1: Imihango (iminsi 1-5). Umwenda usohoka. Icyiciro 2: Follicule. FSH itera gukura. Icyiciro 3: Ovulation (umunsi 14). Intanga irekurwa. Icyiciro 4: Luteale (iminsi 15-28). Progesterone iragabanyuka."'::jsonb
)
WHERE "lessonId" = (SELECT id FROM lessons WHERE slug = 'your_cycle')
AND order_index = 2;

-- Chapter 3: Cramps & pain management
UPDATE chapters
SET localized_narration = jsonb_set(
  localized_narration,
  '{rw}',
  '"Ububabare buterwa na prostaglandins. Uburyo bwo kubugabanya: shyira ubushyuhe ku nda, fata ibuprofen, ukore siporo yoroshye, unywe amazi."'::jsonb
)
WHERE "lessonId" = (SELECT id FROM lessons WHERE slug = 'your_cycle')
AND order_index = 3;

-- Chapter 4: Tracking your cycle
UPDATE chapters
SET localized_narration = jsonb_set(
  localized_narration,
  '{rw}',
  '"Gukurikirana ukwezi bigufasha kumenya umubiri wawe. Andika umunsi wa mbere, iminsi imara, n''ibimenyetso. Mu mezi 3-6, uzabona imiterere. Ukwezi gusanzwe kumara iminsi 21-35."'::jsonb
)
WHERE "lessonId" = (SELECT id FROM lessons WHERE slug = 'your_cycle')
AND order_index = 4;

-- Chapter 5: Common myths
UPDATE chapters
SET localized_narration = jsonb_set(
  localized_narration,
  '{rw}',
  '"Imyumvire itari yo: Ntubarwa koga mu mihango. Ukuri: Siporo igabanya ububabare. Imyumvire itari yo: Amaraso y''imihango ni amahambwe. Ukuri: Ni integanyo isanzwe."'::jsonb
)
WHERE "lessonId" = (SELECT id FROM lessons WHERE slug = 'your_cycle')
AND order_index = 5;

-- Verify updates
SELECT 
  l.slug,
  c.order_index,
  c.title,
  LENGTH(c.localized_narration->>'en') as en_length,
  LENGTH(c.localized_narration->>'fr') as fr_length,
  LENGTH(c.localized_narration->>'rw') as rw_length
FROM chapters c
JOIN lessons l ON c."lessonId" = l.id
WHERE l.slug = 'your_cycle'
ORDER BY c.order_index;
