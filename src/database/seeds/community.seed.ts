import { DataSource } from 'typeorm';
import { Circle } from '../../modules/community/entities/circle.entity';
import { ChatMessage } from '../../modules/community/entities/chat-message.entity';
import { Debate } from '../../modules/community/entities/debate.entity';
import { AnonQuestion } from '../../modules/community/entities/anon-question.entity';
import { User } from '../../modules/users/entities/user.entity';
import bcrypt from 'bcryptjs';

export async function seedCommunity(dataSource: DataSource): Promise<void> {
  const circleRepo   = dataSource.getRepository(Circle);
  const messageRepo  = dataSource.getRepository(ChatMessage);
  const debateRepo   = dataSource.getRepository(Debate);
  const questionRepo = dataSource.getRepository(AnonQuestion);
  const userRepo     = dataSource.getRepository(User);

  // Idempotent — skip if already seeded
  const existingCount = await circleRepo.count();
  if (existingCount > 0) {
    console.log('  ↳ Community already seeded, skipping.');
    return;
  }

  // ── Seed educator accounts ──────────────────────────────────────────────
  const educatorDefs = [
    { username: 'Nurse Aline',     avatarSeed: 'aline',    isPrivate: false },
    { username: 'Dr. Emmanuel',    avatarSeed: 'emmanuel', isPrivate: false },
    { username: 'Counsellor Marie',avatarSeed: 'marie',    isPrivate: false },
  ];

  const educators: Record<string, User> = {};
  for (const def of educatorDefs) {
    let user = await userRepo.findOne({ where: { username: def.username } });
    if (!user) {
      user = userRepo.create({
        username:   def.username,
        avatarSeed: def.avatarSeed,
        language:   'rw',
        isPrivate:  def.isPrivate,
      });
      user = await userRepo.save(user);
    }
    educators[def.username] = user;
  }

  // ── Seed circles ─────────────────────────────────────────────────────────
  const circleDefs = [
    {
      slug: 'cycle_talk',
      name: 'Cycle talk',
      topic: 'Menstrual health',
      emoji: '🌸',
      color: '#E85D75',
      bgColor: '#FCE4E8',
      moderator: 'Nurse Aline',
      messages: [
        { educator: 'Nurse Aline', text: 'Welcome everyone! This is a safe space to ask questions about your menstrual cycle. No question is too small.', lang: 'en' },
        { educator: null, text: 'Is spotting between periods something to worry about?', lang: 'rw', username: 'Amina' },
        { educator: 'Nurse Aline', text: "Occasional spotting can be normal, especially around ovulation. But if it happens often or is heavy, it's worth seeing a provider.", lang: 'en' },
        { educator: null, text: 'Does stress actually affect your period timing?', lang: 'en', username: 'Kalisa' },
        { educator: 'Nurse Aline', text: 'Yes! Stress activates the HPA axis which can suppress GnRH, the hormone that triggers ovulation. High stress can delay or skip your period.', lang: 'en' },
      ],
    },
    {
      slug: 'hiv_testing',
      name: 'HIV & testing',
      topic: 'HIV prevention',
      emoji: '💊',
      color: '#7FA99B',
      bgColor: '#D4E3DC',
      moderator: 'Dr. Emmanuel',
      messages: [
        { educator: 'Dr. Emmanuel', text: 'Free HIV testing is available at all health centres in Rwanda every weekday. Results are confidential.', lang: 'en' },
        { educator: null, text: 'Do you need a referral letter to get tested?', lang: 'rw', username: 'Fidele' },
        { educator: 'Dr. Emmanuel', text: 'No referral needed — you can walk in to any community health post or health centre and request a test.', lang: 'en' },
        { educator: null, text: 'How long after exposure should you wait before testing?', lang: 'en', username: 'Uwase' },
        { educator: 'Dr. Emmanuel', text: 'The window period varies by test type. Most modern tests detect HIV within 18–45 days. A follow-up test at 90 days after exposure is recommended to be certain.', lang: 'en' },
      ],
    },
    {
      slug: 'know_your_body',
      name: 'Know your body',
      topic: 'Reproductive anatomy',
      emoji: '💡',
      color: '#E8A87C',
      bgColor: '#FADFC8',
      moderator: 'Nurse Aline',
      messages: [
        { educator: 'Nurse Aline', text: "Today we're exploring reproductive anatomy. Feel free to use the 3D lesson alongside our chat!", lang: 'en' },
        { educator: null, text: 'What does the cervix actually do?', lang: 'rw', username: 'Clarisse' },
        { educator: 'Nurse Aline', text: 'The cervix is the lower part of the uterus that opens into the vagina. It produces mucus that changes throughout your cycle and dilates during childbirth.', lang: 'en' },
      ],
    },
    {
      slug: 'relationships',
      name: 'Relationships',
      topic: 'Healthy relationships',
      emoji: '💬',
      color: '#4A2F37',
      bgColor: '#F8EADA',
      moderator: 'Counsellor Marie',
      messages: [
        { educator: 'Counsellor Marie', text: 'Healthy relationships are built on mutual respect, open communication, and shared boundaries. What topics would you like to explore today?', lang: 'en' },
        { educator: null, text: "How do you set boundaries when your partner doesn't respect them?", lang: 'rw', username: 'Jean' },
        { educator: 'Counsellor Marie', text: "Start by clearly naming the boundary and the consequence if it's crossed. If a partner consistently ignores your limits, that is a serious red flag worth discussing with a trusted adult or counsellor.", lang: 'en' },
        { educator: null, text: 'How do you tell if a relationship is healthy or not?', lang: 'en', username: 'Ange' },
        { educator: 'Counsellor Marie', text: 'Signs of a healthy relationship include: feeling safe to be yourself, decisions made together, both partners having time for friends/family, no fear of the other\'s reactions. Red flags: isolation, jealousy as "proof of love," frequent criticism.', lang: 'en' },
      ],
    },
  ];

  for (const def of circleDefs) {
    const circle = await circleRepo.save(
      circleRepo.create({
        slug:      def.slug,
        name:      def.name,
        topic:     def.topic,
        emoji:     def.emoji,
        color:     def.color,
        bgColor:   def.bgColor,
        moderator: def.moderator,
      }),
    );

    // Seed peer accounts for messages
    const peerCache: Record<string, User> = {};
    for (const msg of def.messages) {
      let user: User;
      if (msg.educator) {
        user = educators[msg.educator];
      } else if (msg.username) {
        if (!peerCache[msg.username]) {
          let peer = await userRepo.findOne({ where: { username: msg.username } });
          if (!peer) {
            peer = await userRepo.save(
              userRepo.create({
                username:   msg.username,
                avatarSeed: msg.username.toLowerCase(),
                language:   'rw',
              }),
            );
          }
          peerCache[msg.username] = peer;
        }
        user = peerCache[msg.username];
      } else {
        continue;
      }

      await messageRepo.save(
        messageRepo.create({
          circle,
          user,
          text:       msg.text,
          isEducator: !!msg.educator,
          lang:       msg.lang ?? 'rw',
        }),
      );
    }
  }

  // ── Seed debates ─────────────────────────────────────────────────────────
  const debateDefs = [
    {
      question:  'Should schools teach SRH from age 12?',
      tag:       'EDUCATION · OPEN DEBATE',
      heatColor: '#E85D75',
    },
    {
      question:  'Is period tracking apps data really private?',
      tag:       'PRIVACY · OPEN DEBATE',
      heatColor: '#F4B860',
    },
    {
      question:  'Do condoms matter if both partners are tested?',
      tag:       'HIV · OPEN DEBATE',
      heatColor: '#7FA99B',
    },
  ];

  for (const def of debateDefs) {
    await debateRepo.save(debateRepo.create(def));
  }

  // ── Seed anonymous questions ──────────────────────────────────────────────
  const questionDefs = [
    {
      text:       'Is it ok my cycle comes every 35 days?',
      answered:   false,
      reply:      null,
      answeredBy: null,
    },
    {
      text:       'Can you get HIV from kissing?',
      answered:   true,
      reply:      'No — HIV is not transmitted through saliva. Dr. K answered.',
      answeredBy: 'Dr. Emmanuel',
    },
    {
      text:       'Do boys have periods too in a different way?',
      answered:   true,
      reply:      'Not periods, but hormonal cycles exist. Nurse Ange explained.',
      answeredBy: 'Nurse Aline',
    },
  ];

  for (const def of questionDefs) {
    await questionRepo.save(questionRepo.create(def));
  }

  console.log('  ↳ Community seeded: 4 circles, 3 debates, 3 questions.');
}
