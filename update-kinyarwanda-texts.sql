-- Update Kinyarwanda narration texts to be shorter and simpler

-- Chapter 0: What is menstruation?
UPDATE chapters 
SET "localized_narration" = jsonb_set(
  "localized_narration",
  '{rw}',
  '"Incurane ni imikorere y''umubiri iba buri kwezi. Itegura umubiri kwakira inda. Umuzingo w''incurane umara iminsi 21 kugeza 35. Umwenda wa nyababyeyi urabyibuha hanyuma ugasohoka niba nta gusama. Ibyo ni imihango. Imisemburo igenzura buri cyiciro."'
)
WHERE "order_index" = 0 
AND "lessonId" IN (SELECT id FROM lessons WHERE slug = 'your_cycle');

-- Chapter 1: The uterus and ovaries
UPDATE chapters 
SET "localized_narration" = jsonb_set(
  "localized_narration",
  '{rw}',
  '"Nyababyeyi ni urugingo rw''imikaya rufite ishusho isa n''ipera. Intangangore ebyiri zitanga intanga ngore n''imisemburo. Imiyoboro ihuza intangangore na nyababyeyi. Mu gihe cya ovulation, intanga ngore irekurwa. Niba ihuye n''intanga ngabo, ishobora gusama ikakura ikaba umwana."'
)
WHERE "order_index" = 1 
AND "lessonId" IN (SELECT id FROM lessons WHERE slug = 'your_cycle');

-- Chapter 2: The 4 phases
UPDATE chapters 
SET "localized_narration" = jsonb_set(
  "localized_narration",
  '{rw}',
  '"Icyiciro cya 1: Imihango (iminsi 1-5). Umwenda usohoka, imisemburo iri hasi. Icyiciro cya 2: Follicule. FSH itera udufolikule gukura. Icyiciro cya 3: Ovulation (umunsi wa 14). Intanga ngore irekurwa. Iki ni gihe cy''uburumbuke. Icyiciro cya 4: Luteale (iminsi 15-28). Progesterone iragabanyuka, imihango igatangira."'
)
WHERE "order_index" = 2 
AND "lessonId" IN (SELECT id FROM lessons WHERE slug = 'your_cycle');

-- Chapter 3: Cramps & pain management
UPDATE chapters 
SET "localized_narration" = jsonb_set(
  "localized_narration",
  '{rw}',
  '"Ububabare buterwa na prostaglandins. Uburyo bwo kubugabanya: shyira ubushyuhe ku nda, fata ibuprofen, ukore siporo yoroshye, kandi unywe amazi ahagije."'
)
WHERE "order_index" = 3 
AND "lessonId" IN (SELECT id FROM lessons WHERE slug = 'your_cycle');

-- Chapter 4: Tracking your cycle
UPDATE chapters 
SET "localized_narration" = jsonb_set(
  "localized_narration",
  '{rw}',
  '"Gukurikirana ukwezi bigufasha kumenya umubiri wawe no guteganya imihango. Andika umunsi wa mbere, iminsi imara, n''ibimenyetso. Mu mezi 3-6, uzabona imiterere isanzwe. Ukwezi gusanzwe kumara iminsi 21-35."'
)
WHERE "order_index" = 4 
AND "lessonId" IN (SELECT id FROM lessons WHERE slug = 'your_cycle');

-- Chapter 5: Common myths (already updated in frontend)
UPDATE chapters 
SET "localized_narration" = jsonb_set(
  "localized_narration",
  '{rw}',
  '"Imyumvire itari yo: Ntubarwa koga cyangwa gukora siporo mu gihe cy''imihango. Ukuri: Siporo irashobora kugabanya ububabare bw''inyungu binyuze mu kongera umuvuduko w''amaraso. Koga birashoboka kandi birahariwe. Imyumvire itari yo: Amaraso y''imihango ni amahambwe cyangwa ntashyira mu ijoro. Ukuri: Umukungugu w''imihango ni integanyo isanzwe y''amaraso, insoro z''endometri, n''imihendo."'
)
WHERE "order_index" = 5 
AND "lessonId" IN (SELECT id FROM lessons WHERE slug = 'your_cycle');

-- HIV Lessons
UPDATE chapters 
SET "localized_narration" = jsonb_set(
  "localized_narration",
  '{rw}',
  '"VIH ni virusi yangiza ubudahangarwa bw''umubiri. Yibasira uturemangingo twa CD4. Iyo itavuwe, ishobora kugera ku SIDA. Imiti ya ART igabanya virusi mu maraso. Abafata ART neza bashobora kubaho ubuzima burebure."'
)
WHERE "order_index" = 0 
AND "lessonId" IN (SELECT id FROM lessons WHERE slug = 'hiv_prevention');

UPDATE chapters 
SET "localized_narration" = jsonb_set(
  "localized_narration",
  '{rw}',
  '"VIH yandurira mu matembabuzi y''umubiri: amaraso, amasohoro, amatembabuzi yo mu myanya ndangagitsina, n''amata yonsa. Ikunze kwandurira mu mibonano idakingiye, gusangira inshinge, cyangwa kuva ku mubyeyi ujya ku mwana. Ntiyandurira mu macandwe, ibyuya, kurya hamwe, cyangwa kurumwa n''udukoko."'
)
WHERE "order_index" = 1 
AND "lessonId" IN (SELECT id FROM lessons WHERE slug = 'hiv_prevention');

UPDATE chapters 
SET "localized_narration" = jsonb_set(
  "localized_narration",
  '{rw}',
  '"Uburyo bwo kwirinda VIH: gukoresha agakingirizo neza buri gihe, kwipimisha kenshi, no gukoresha PrEP ku bantu bafite ibyago. Niba habayeho ibyago vuba, shakisha PEP mu masaha 72. Ntugasangire inshinge n''abandi."'
)
WHERE "order_index" = 2 
AND "lessonId" IN (SELECT id FROM lessons WHERE slug = 'hiv_prevention');

UPDATE chapters 
SET "localized_narration" = jsonb_set(
  "localized_narration",
  '{rw}',
  '"ART ni imiti ihagarika kwiyongera kwa VIH. Iyo ifashwe buri munsi neza, virusi ishobora kugera ku rwego rudasanzwe ruboneka. Ibyo bisobanura ko idashobora kwanduza (U=U). Mu Rwanda, ART itangirwa ubuntu."'
)
WHERE "order_index" = 3 
AND "lessonId" IN (SELECT id FROM lessons WHERE slug = 'hiv_prevention');

UPDATE chapters 
SET "localized_narration" = jsonb_set(
  "localized_narration",
  '{rw}',
  '"Kwipimisha ni bwo buryo bwonyine bwo kumenya niba ufite VIH. Mu Rwanda, serivisi yo kwipimisha ni ubuntu kandi ikorwa mu ibanga. Ivangura rikomoka ku makuru atari yo. VIH ni indwara ivurwa kandi igenzurwa."'
)
WHERE "order_index" = 4 
AND "lessonId" IN (SELECT id FROM lessons WHERE slug = 'hiv_prevention');

-- Anatomy lesson
UPDATE chapters 
SET "localized_narration" = jsonb_set(
  "localized_narration",
  '{rw}',
  '"Imiterere y''imyanya myibarukiro ni ingingo z''umubiri zigira uruhare mu kororoka. Kuyisobanukirwa bigufasha gufata ibyemezo byiza, kumenya impinduka zidasanzwe, no kuganira neza n''abaganga."'
)
WHERE "order_index" = 0 
AND "lessonId" IN (SELECT id FROM lessons WHERE slug = 'anatomy_101');
