import { neon } from "@neondatabase/serverless";

const PART1 = [
  ["Watch", [
    "Do you wear a watch?",
    "Have you ever got a watch as a gift?",
    "Why do some people wear expensive watches?",
    "Do you think it is important to wear a watch? Why?",
  ]],
  ["Cars", [
    "Do you think car colours are important?",
    "Did you enjoy traveling by car when you were a kid?",
    "What types of cars do you like?",
    "Do you prefer to be a driver or a passenger?",
    "What do you usually do when there is a traffic jam?",
  ]],
  ["Websites", [
    "What kinds of websites do you often visit?",
    "What is your favourite website?",
    "Are there any changes to the websites you often visit?",
    "What kinds of websites are popular in your country?",
  ]],
  ["Mirrors", [
    "Do you like looking at yourself in the mirror? How often?",
    "Have you ever bought mirrors?",
    "Do you usually take a mirror with you?",
    "Would you use mirrors to decorate your room?",
  ]],
  ["Public gardens and parks", [
    "Did you like going to parks as a child?",
    "Do you still like going to parks now?",
    "Would you like to see more parks in your city?",
    "Are there any parks you want to go to in the future?",
    "Would you prefer to play in a personal garden or public garden?",
    "How are the parks today different from those you visited as a kid?",
    "What do you like to do when visiting a park?",
    "Would you like to play in a public garden or park?",
  ]],
  ["Shopping", [
    "How often do you go shopping?",
    "Do you prefer online shopping or in-store shopping?",
    "Have you ever returned anything you bought online?",
    "Do you like shopping?",
  ]],
  ["Tidiness", [
    "Do you like to keep things tidy?",
    "Did you use to keep your room tidy as a child?",
  ]],
  ["Music", [
    "Do you prefer sad or happy music?",
    "Does happy music make you feel more excited?",
  ]],
  ["Teachers", [
    "Do you have a favorite teacher?",
    "In what way has your favourite teacher helped you?",
    "Are you still in touch with your primary school teachers?",
    "Do you have a teacher from your past that you still remember?",
    "Do you want to be a teacher in the future?",
  ]],
  ["Social media", [
    "Have you ever posted anything on social media?",
    "When did you start using social media?",
    "Do you think you spend too much time on social media?",
    "Do your friends use social media?",
    "What do people often do on social media?",
  ]],
  ["Clothing", [
    "What kind of clothes do you like to wear?",
    "Do you prefer to wear comfortable and casual clothes or smart clothes?",
    "Do you like wearing T-shirts?",
    "Do you spend a lot of time choosing clothes?",
  ]],
  ["Films/cinemas", [
    "How often do you watch films?",
    "Do you prefer to watch films at home or in the cinema?",
    "What films do you like?",
    "Did you often watch films when you were a child?",
    "Did you ever go to the cinema alone as a child?",
    "Do you often go to the cinema with your friends?",
    "Do you think going to the cinema is a good way to spend time with friends?",
  ]],
  ["Dream and ambition", [
    "What was your childhood dream?",
    "Are you the kind of person who sticks to dreams?",
    "What is your dream job?",
    "Do you think you are an ambitious person?",
  ]],
  ["Outer space and stars", [
    "Have you ever learnt about outer space and stars?",
    "Do you like science fiction movies? Why?",
    "Do you want to know more about outer space?",
    "Do you want to go into outer space in the future?",
  ]],
  ["Singing", [
    "Do you like singing? Why?",
    "Have you ever learnt how to sing?",
    "Who do you want to sing for?",
    "Do you think singing can bring happiness to people?",
  ]],
  ["Old buildings", [
    "Have you ever seen old buildings in the city?",
    "Do you think we should preserve old buildings in cities?",
    "Do you prefer living in an old building or a modern house?",
    "Are there any old buildings you want to see in the future? Why?",
  ]],
  ["Science", [
    "Do you like science?",
    "When did you start to learn about science?",
    "Which science subject is interesting to you?",
    "What kinds of interesting things have you done with science?",
    "Do you like watching science TV programs?",
    "Do Vietnamese people often visit science museums?",
  ]],
  ["Headphones", [
    "Do you use headphones?",
    "What type of headphones do you use?",
    "When would you use headphones?",
    "In what conditions would you not use headphones?",
  ]],
  ["Jokes & Comedies", [
    "Are you good at telling jokes?",
    "Do your friends like to tell jokes?",
    "Do you like to watch comedies?",
    "Have you ever watched a live show?",
  ]],
  ["History", [
    "Did you like history when you were young?",
    "When was the last time you read about history?",
    "Do you like history?",
    "Have you ever been to historical museums?",
  ]],
  ["Views", [
    "Do you like taking pictures of different views?",
    "Do you prefer views in urban areas or rural areas?",
    "Do you prefer views in your own country or in other countries?",
    "Have you seen an unforgettable and beautiful view or scenery?",
  ]],
  ["Childhood activities", [
    "What are your favourite activities?",
    "What were your favourite activities when you were a child?",
    "Did you prefer to do activities alone or with a group of people when you were a child?",
    "Are there any differences between the activities you liked when you were a child and those you like now?",
  ]],
  ["Building", [
    "Are there tall buildings near your home?",
    "Do you take photos of buildings?",
    "Is there a building that you would like to visit?",
  ]],
  ["Scenery", [
    "Do you look out the window at the scenery when travelling by bus or car?",
    "Do you prefer the mountains or the sea?",
    "Do you like to take scenery pictures?",
    "What are the most beautiful sights you have seen while travelling?",
  ]],
  ["Reading", [
    "Do you like reading?",
    "Do you prefer to read on paper or on a screen?",
    "When do you need to read carefully, and when not?",
    "Do you prefer scanning or detailed reading?",
  ]],
  ["Sports team", [
    "Have you ever been part of a sports team?",
    "Are team sports popular in your culture?",
    "Do you like watching team games? Why?",
    "What are the differences between team sports and individual sports?",
  ]],
  ["Walking", [
    "Do you walk a lot?",
    "Did you often go outside to have a walk when you were a child?",
    "Why do people like to walk in parks?",
    "Where would you like to take a long walk if you had the chance?",
    "Where did you go for a walk lately?",
  ]],
  ["Typing", [
    "Do you prefer typing or handwriting?",
    "Do you type on a desktop or laptop keyboard every day?",
    "When did you learn how to type on a keyboard?",
    "How do you improve your typing?",
  ]],
  ["Food", [
    "What is your favourite food?",
    "What kind of food did you like when you were young?",
    "Has your favourite food changed since you were a child?",
    "Do you eat different foods at different times of the year?",
  ]],
  ["Hobby", [
    "Do you have the same hobbies as your family members?",
    "Do you have a hobby that you've had since childhood?",
    "Did you have any hobbies when you were a child?",
    "Do you have any hobbies?",
  ]],
  ["Life stages", [
    "Do you enjoy being the age you are now?",
    "What did you often do with your friends in your childhood?",
    "What do you think is the most important at the moment?",
    "Do you have any plans for the next five years?",
    "How do people remember each stage of their lives?",
    "At what age do you think people are the happiest?",
  ]],
  ["Gifts", [
    "What gift have you received recently?",
    "Have you ever sent handmade gifts to others?",
    "Have you ever received a great gift?",
    "What do you consider when choosing a gift?",
    "Do you think you are good at choosing gifts?",
  ]],
  ["The city you live in", [
    "Would you recommend your city to others?",
    "What's the weather like where you live?",
    "Are there people of different ages living in this city?",
    "Are the people friendly in the city?",
    "Is the city friendly to children and old people?",
    "Do you often see your neighbors?",
    "What city do you live in?",
    "Do you like this city? Why?",
    "How long have you lived in this city?",
    "Are there big changes in this city?",
    "Is this city your permanent residence?",
  ]],
  ["Day off", [
    "When was the last time you had a few days off?",
    "What do you usually do when you have days off?",
    "Do you usually spend your days off with your parents or with your friends",
    "What would you like to do if you had a day off tomorrow?",
  ]],
  ["Morning time", [
    "Do you like getting up early in the morning?",
    "What do you usually do in the morning?",
    "What did you do in the morning when you were little? Why?",
    "Are there any differences between what you do in the morning now and what you did in the past?",
    "Do you spend your mornings doing the same things on both weekends and weekdays? Why?",
  ]],
  ["Dreams", [
    "Can you remember the dreams you had?",
    "Do you share your dreams with others?",
    "Do you think dreams have special meanings?",
    "Do you want to make your dreams come true?",
  ]],
  ["Pets and Animals", [
    "What's your favourite animal? Why?",
    "Where do you prefer to keep your pet, indoors or outdoors?",
    "Have you ever had a pet before?",
    "What is the most popular animal in Vietnam?",
  ]],
  ["Work or studies", [
    "What subjects are you studying?",
    "Do you like your subject?",
    "Why did you choose to study that subject?",
    "Do you think that your subject is popular in your country?",
    "Do you have any plans for your studies in the next five years?",
    "What are the benefits of being your age?",
    "Do you want to change your major?",
    "Do you prefer to study in the mornings or in the afternoons?",
    "How much time do you spend on your studies each week?",
    "Are you looking forward to working?",
    "What technology do you use when you study?",
    "What changes would you like to see in your school?",
    "What work do you do?",
    "Why did you choose to do that type of work (or that job)?",
    "Do you like your job?",
    "What requirements did you need to meet to get your current job?",
    "Do you have any plans for your work in the next five years?",
    "What do you think is the most important at the moment?",
    "Do you want to change to another job?",
    "Do you miss being a student?",
    "What technology do you use at work?",
    "Who helps you the most? And how?",
  ]],
  ["Home & Accommodation", [
    "Who do you live with?",
    "Do you live in an apartment or a house?",
    "What part of your home do you like the most?",
    "What's the difference between where you are living now and where you have lived in the past?",
    "What kind of house or apartment do you want to live in in the future?",
    "What room does your family spend most of the time in?",
    "What do you usually do in your apartment?",
    "What kinds of accommodation do you live in?",
    "Do you plan to live there for a long time?",
    "Can you describe the place where you live?",
    "Do you prefer living in a house or an apartment?",
    "Please describe the room you live in.",
    "What's your favorite room in your apartment or house?",
    "What makes you feel pleasant in your home?",
    "How long have you lived there?",
    "Do you think it is important to live in a comfortable environment?",
  ]],
  ["Hometown", [
    "Have you learned anything about the history of your hometown?",
    "Did you learn about the culture of your hometown in your childhood?",
    "Is that a big city or a small place?",
    "Do you like your hometown?",
    "What do you like (most) about your hometown?",
    "Is there anything you dislike about it?",
    "How long have you been living there?",
    "Do you like living there?",
    "Please describe your hometown a little.",
    "What's your hometown famous for?",
    "Did you learn about the history of your hometown at school?",
    "Are there many young people in your hometown?",
    "Is your hometown a good place for young people to pursue their careers?",
  ]],
  ["The area you live in", [
    "Do you live in a noisy or a quiet area?",
    "Are the people in your neighborhood nice and friendly?",
    "Do you like the area that you live in?",
    "Where do you like to go in that area?",
    "Do you know any famous people in your area?",
    "What are some changes in the area recently?",
    "Do you know any of your neighbours?",
  ]],
];

const PART2 = [
  ["Describe a change that you made recently", ["What the change was", "What caused the change", "What you did for the change", "And explain how you feel about the change"]],
  ["Describe a time when you changed an important opinion of yours", ["When you changed your opinion", "What the original opinion was", "Why you changed it", "And explain how you felt about the experience"]],
  ["Describe a law on environmental protection", ["What it is", "How you first learned about it", "Who benefits from it", "And explain how you feel about this law"]],
  ["Describe a long-term goal/ambition you would like to achieve", ["How long you have had this goal/ambition", "What it is", "How you will achieve it", "And explain why you set it"]],
  ["Describe a time when you sent a message or an email to someone but received no reply for a long time", ["Who you sent it to", "What the message/email was about", "Whether you finally received the reply", "And explain how you felt about the experience"]],
  ["Describe a story/book with animals in it", ["What animals are in it", "What the story/book is about", "Why you read the story/book", "And explain what you think of this story/book"]],
  ["Describe a time when you were stuck in a traffic jam for a very long time", ["When it happened", "Where you were stuck", "What you did while waiting", "And explain how you felt in the traffic jam"]],
  ["Describe a special day out that cost you little money/didn't cost you much", ["When the day was", "Where you went", "How much you spent", "And explain how you feel about the day"]],
  ["Describe a time when you organized a happy event successfully", ["What the event was", "How you prepared for it", "Who helped you to organize it", "And explain why you think it was a successful event"]],
  ["Describe a special cake you received from others", ["When it happened", "Where it happened", "Who you got the cake from", "And explain why it's a special cake"]],
  ["Describe a time when you had a problem using an electronic device", ["When it happened", "Where it happened", "What the problem was", "And explain how you solved the problem at last"]],
  ["Describe a TV show/online program you have watched recently", ["What it is", "What it is about", "How often you watch it", "And explain how you feel about it"]],
  ["Describe an advertisement with a famous person in it", ["Who the person is", "Where you can see it", "What the advertisement is about", "And explain how you feel about the advertisement"]],
  ["Describe a place you have travelled to that you would like to recommend to others", ["What it is", "Where it is", "What you saw and did there", "And explain why you would like to recommend it to others"]],
  ["Describe a challenging technological problem you faced", ["What the problem was", "When and where you faced it", "How challenging it was", "And explain how you solved it"]],
  ["Describe a person who is good at learning and speaking new languages", ["How you got to know him/her", "How he/she learns a new language", "What languages he/she can speak", "And explain how you feel about him/her"]],
  ["Describe a person who works in a successful company", ["Who he/she is", "What he/she does in the company", "What business the company does", "And explain why you think it is a successful company"]],
  ["Describe a place you would like to visit in your free time", ["Where it is", "What you will do there", "How long you will stay there", "And explain why you would like to visit it"]],
  ["Describe a food that people eat on special occasions/events", ["What it is", "What the special event/occasion is", "How it is cooked/made", "And explain why people eat it on that special occasion/event"]],
  ["Describe a live sports event you watched and liked", ["What it was", "When and where you watched it", "Who you watched it with", "And explain why you liked it"]],
  ["Describe a person you know who would like to choose a career in the medical field (e.g. a doctor, a nurse)", ["When you knew him/her", "When he/she started to think about that", "What he/she would like to do", "And explain why he/she would like to choose this career"]],
  ["Describe a time when you worked in a group", ["What you did", "Who you worked with", "What problems you faced", "And explain why you worked in the group"]],
  ["Describe a person you know who has a successful business", ["Who this person is", "How you got to know him/her", "Why and how he/she started the business", "What business he/she does", "And explain why you think the business is successful"]],
  ["Describe a person who loves to grow plants (e.g. vegetables, flowers) at home or in the garden", ["Who this person is", "What plants he/she grows", "How he/she grows the plants", "And explain why he/she loves growing plants"]],
  ["Describe your favorite city that you have visited", ["Where it is", "How you knew it", "When you visited it", "And explain why it is your favourite city"]],
  ["Describe an interesting video", ["When and where you watched it", "What it is about", "Why you watched it", "And explain how you feel about it"]],
  ["Describe a tall building you like or dislike", ["What it is used for", "Where it is", "What it looks like", "And explain why you like/dislike it"]],
  ["Describe a boring place", ["Where it is", "Who you went there with", "What you did there", "And explain why you think it is a boring place"]],
  ["Describe a plan that you had to change recently", ["When this happened", "What made you change the plan", "What the new plan was", "And how you felt about the change"]],
  ["Describe a new law you would like to introduce in your country", ["What law it is", "What changes this law brings", "Whether this new law will be popular", "How you came up with the new law", "And explain how you feel about this new law"]],
  ["Describe an important decision that you made", ["What the decision was", "How you made your decision", "What the results of the decision were", "And explain why it was important"]],
  ["Describe a friend from your childhood", ["Who he/she is", "Where and how you met each other", "What you often did together", "And explain what made you like him/her"]],
  ["Describe a thing you did to learn another language", ["What language you learned", "What you did", "How it helped you learn the language", "And how you felt about it"]],
  ["Describe a time when you got up early", ["When it was", "What you did", "Why you got up early", "And how you felt about it"]],
  ["Describe a home that you like to visit but do not want to live in", ["Where it is", "What it is like", "Why you like to visit it", "And explain why you would not like to live there"]],
  ["Describe an important river/lake in your country", ["Where it is located", "How big/long it is", "What it looks like", "And explain why it is important"]],
  ["Describe a city you enjoyed visiting", ["Where it is", "When you visited it", "How long you stayed there", "What you did there", "And explain why you enjoyed visiting it"]],
  ["Describe a person who likes to look after the natural world", ["Who this person is", "What he or she does", "How he or she does it", "How often he or she does it"]],
  ["Describe a short-term job you want to have in a foreign country", ["Where it is", "How you know of it", "What the job is", "And explain why you want to do it"]],
  ["Describe a time when you gave advice to others", ["When it was", "To whom you gave the advice", "What the advice was", "And explain why you gave the advice"]],
  ["Describe a person who often helps others", ["Who this person is", "How often he/she helps others", "How/why he/she helps others", "And how you feel about this person"]],
  ["Describe an event you attended in which you didn't enjoy the music played", ["What it was", "Who you went with", "Why you decided to go there", "And explain why you didn't enjoy it"]],
  ["Describe one of your friends who learned something without a teacher", ["Who he/she is", "What he/she learned", "Why he/she learned this", "And explain whether it would be easier to learn from a teacher"]],
  ["Describe a piece of technology (not a phone) that you would like to own", ["What it is", "How much it costs", "How you knew it", "And explain why you would like to own it"]],
  ["Describe a perfect job you would like to have in the future", ["What it is", "How you knew it", "What you need to learn to get this job", "And explain why you think it is a perfect job for you"]],
  ["Describe a child who loves drawing/painting", ["Who he/she is", "How/when you knew him/her", "How often he/she draws/paints", "And explain why you think he/she loves drawing/painting"]],
  ["Describe a program or app on your computer or phone", ["What it is", "How often you use it", "When/how you use it", "When/how you found it", "And explain how you feel about it"]],
  ["Describe a person who makes plans a lot and is good at planning", ["Who he/she is", "How you knew him/her", "What plans he/she makes", "And explain how you feel about this person"]],
  ["Describe a famous person you would like to meet", ["Who he/she is", "How you knew him/her", "How/where you would like to meet him/her", "And explain why you would like to meet him/ her"]],
  ["Describe an interesting building", ["Where it is", "What it looks like", "What function it has", "And explain why you think it is interesting"]],
  ["Describe a movie you watched and enjoyed recently", ["When and where you watched it", "Who you watched it with", "What it was about", "And explain why you watched this movie"]],
  ["Describe something that you can't live without (not a computer/phone)", ["What it is", "What you do with it", "How it helps you in your life", "And explain why you can't live without it"]],
  ["Describe a city that you think is very interesting/famous", ["Where it is", "What it is famous for", "How you knew this city", "And explain why you think it is very interesting/famous"]],
  ["Describe an item on which you spent more than expected", ["Where it is", "What it is famous for", "How you knew this city", "And explain why you think it is very interesting/famous"]],
  ["Describe a time when you felt proud of a family member", ["When it happened", "Who the person is", "What the person did", "And explain why you felt proud of him/her"]],
  ["Describe a bicycle/motorcycle/car trip you would like to go", ["Who you would like to go with", "Where you would like to go", "When you would like to go", "And explain why you would like to go by bicycle/motorcycle/car"]],
  ["Describe a person who solved a problem in a smart way", ["Who this person is", "What the problem was", "How he/she solved it", "And explain why you think he/she did it in a smart way"]],
  ["Describe an occasion when many people were smiling", ["When it happened", "Who you were with", "What happened", "And explain why most people were smiling"]],
  ["Describe an occasion when you were not allowed to use your mobile phone", ["When it was", "Where it was", "Why you were not allowed to use your mobile phone", "And how you felt about it"]],
  ["Describe a time when you encouraged someone to do something that he/she didn't want to do", ["Who he or she is", "What you encouraged him/her to do", "How he/she reacted", "And explain why you encouraged him/her to do it"]],
  ["Describe something important that has been kept in your family for a long time", ["What it is", "When your family had it", "How your family got it", "And explain why it is important to your family"]],
  ["Describe a time you needed to use your imagination", ["When it was", "Why you needed to use imagination", "How difficult or easy it was", "And explain how you felt about it"]],
];

const PART3 = [
  ["Topic 1", ["Do you think it is good to change one's daily routine?", "Do you think it is good to change jobs?", "Is it good for people to get a job promotion?", "Do people often make plans around their regular routines?", "Who tend to change their daily routine more, young people or old people?"]],
  ["Topic 2", ["When do most children begin to have their own opinions?", "Whose opinions are more important to children, their parents' or teachers'?", "Do children communicate more with teachers or with parents?", "Who do young people like to share opinions with?"]],
  ["Topic 3", ["What kinds of rules do schools in Vietnam have?", "Do you think school rules are important?", "Are children unhappy with the school rules?", "How can parents and teachers help children understand and follow rules?", "What are the rules people should obey at work?", "What is the purpose of punishment?"]],
  ["Topic 4", ["Why should children have ambitions?", "What do you think of people going after high positions?", "Why are some young people keen on being fans of superstars?", "Is it good for a person to be ambitious?", "Do you think it is necessary to be ambitious when working in a team in a company?", "Should parents support their children in pursuing their ambitions?"]],
  ["Topic 5", ["In what situations do people spend a long time responding to others' messages?", "In what situations do people not respond to messages at all?", "What would you do if you did not receive a reply after sending out a message?", "Why do some people prefer sending a message instead of making a call?", "How do you show your respect in your messages?", "Why do some people feel angry when others don't reply to their message?"]],
  ["Topic 6", ["Should schools teach children about animals?", "Some people think pets should not be kept in cities. What do you think?", "Many people regard pets as members of their family. What do you think?", "Do many people keep pets in your country?", "What are the advantages of keeping a pet?", "Why do people always tell children stories with animals?"]],
  ["Topic 7", ["Do you like to use public transport?", "Would you rather be in a car or a bus in a traffic jam?", "How can we solve the traffic jam problem?", "Do you think developing public transport can solve traffic jam problems?", "Do you think the high ways will help reduce traffic jams?", "What are good ways to manage traffic?"]],
  ["Topic 8", ["Do people like to spend their leisure time out in your country?", "How do people spend their leisure time in your country?", "How does technology affect the way people spend their leisure time?", "Do you think only old people have time for leisure?", "Why do people like to have days off?", "Going out to have holidays is tiring. Why do people still want to do it?"]],
  ["Topic 9", ["How would you feel when you were not well prepared for something?", "Do you prefer to prepare and organize an activity or just take part in an activity?", "How can parents help children to be organized?", "On what occasions do people need to be organized?", "Does everything need to be well prepared?", "Do people need others' help when organizing things?"]],
  ["Topic 10", ["In your country, do people nowadays cook at home as frequently as people did in the past?", "What do you think of people using their mobile phones during a meal?", "What are the differences between special food in Vietnam and other countries?", "Is there any food in your country that is eaten at special times or on special occasions?", "Why are some people willing to spend a lot of money on meals on special days?", "Do you think it's good to communicate when eating with your family?"]],
  ["Topic 11", ["Why are people keen on buying new electronic devices?", "What impact do electronic devices have on people?"]],
  ["Topic 12", ["What are the differences between the TV programs young people like to watch and those old people like to watch?", "What makes a popular TV or online program?", "What kinds of TV or online programs are popular in your country?"]],
  ["Topic 13", ["What are the advantages and disadvantages of advertisements?", "Why are many advertisements endorsed by celebrities? How useful are they?", "What is the most important factor in an advertisement?", "Why are some advertisements boring?", "Is advertising important for a company? Why?", "Which is more effective, online advertising or offline advertising?"]],
  ["Topic 14", ["Where do people in your country often go for holidays?", "What is the ideal length for a holiday?", "How do people usually plan holidays?", "Is it important to plan a holiday?"]],
  ["Topic 15", ["What are the advantages and disadvantages of AI?", "Do you think people today should learn about AI technology?", "Should children learn to use AI?", "How can AI help in our lives?", "Do you think students are overly reliant on AI?", "What can teachers do to stop students from relying too much on AI?"]],
  ["Topic 16", ["Are there many people who can speak foreign languages in your country?", "Does speaking other languages help at work?", "Do people learn any languages other than English?", "Why is it easier for children to learn new things than for adults?", "How do people learn new things?"]],
  ["Topic 17", ["Do you think governments should provide financial support to companies?", "Do you think companies should donate money to help society?", "Do you think customer satisfaction is important for a company?"]],
  ["Topic 18", ["Why do you think some people choose not to travel abroad?", "Do you think a gap period in life is important?"]],
  ["Topic 19", ["Why are there special foods on special occasions or events?", "What are the differences between everyday food and festival food?", "Are there any differences between the food people eat today and the food people ate in the past?"]],
  ["Topic 20", ["Why do some people like to watch sports events?", "Where do people normally watch sports events?", "What are the advantages of watching sports events online?", "What sports matches are suitable for children to attend?"]],
  ["Topic 21", ["Do you think being a doctor is easy or difficult?", "Do you think learning biology is interesting for children?"]],
  ["Topic 22", ["Why do some people prefer to work by themselves?", "What should a leader do to make team members want to follow him or her?", "Should students learn to do group work?", "What group tasks are there in schools?"]],
  ["Topic 23", ["Why do some people start their own business?", "Should governments provide financial support to start-ups?", "Do most people prefer shopping at big stores or small stores?", "What makes a business successful?", "What makes a business fail?"]],
  ["Topic 24", ["What are the advantages of growing vegetables or flowers at home?", "Do many people grow vegetables or flowers at home in your country?", "Is it easy to grow plants at home?", "Why do some people like to grow plants?", "Why do some people prefer to grow their own fruits and vegetables instead of buying them from the market?"]],
  ["Topic 25", ["Which is more suitable for young people, urban life or rural life, and which is more suitable for old people?", "How do people choose a city to travel to?", "Do you think a tourist city is also a good place to live? Why?", "Do most people prefer traveling to a modern city or a historical city?"]],
  ["Topic 26", ["What kind of videos do people in your country like to watch?", "Which is more helpful, watching videos or reading books?", "What skills can people learn from watching videos?", "Are there any differences between the videos that young people and old people like to watch?"]],
  ["Topic 27", ["Are there many tall buildings in your country?", "What are the differences between those tall buildings in your country?", "Why are different places laid out and designed differently?"]],
  ["Topic 28", ["Why do most children think education is boring?", "Why aren't young people willing to listen to the experiences of older people?", "What can people do when they feel bored?", "Why are some teachers' classes boring? Are there any solutions?"]],
  ["Topic 29", ["Do people often change their plans?", "Would you tell others if you change your plan?", "Why do you think parents still make plans for their children nowadays?", "How does technology help people make plans?"]],
  ["Topic 30", ["What rules should students follow at school?", "Do people in your country usually obey the law?", "What kinds of behavior are considered as good behavior?", "Do you think children can learn about the law outside of school?", "What are the benefits for people to obey rules?", "How can parents teach children to obey rules?"]],
  ["Topic 31", ["Do you think children sometimes have to make important decisions?", "What important decisions do teenagers need to make after graduation?", "Who can children turn to for help when making a decision?", "Do you think advertisements can influence our decisions when shopping?", "Do you think the influence of advertising is good?", "How do people usually make important decisions?"]],
  ["Topic 32", ["Do you still keep in touch with your friends from childhood? Why or why not?", "How important is childhood friendship to children?", "What do you think of communicating via social media?", "Do you think online communication through social media will replace face-to-face communication?", "What's the difference between having younger friends and older friends?", "Has technology changed people's friendships? How?"]],
  ["Topic 33", ["What are the advantages and disadvantages of learning a language?", "Some people think that technology has made it unnecessary to learn languages. What do you think?", "What difficulties do people face when learning a language?", "Do you think language learning is important? Why?", "Which is better, to study a language alone or to study it in a group? Why?", "What's the best way to learn a language?"]],
  ["Topic 34", ["Is it good to arrive early in any situation?", "Do you know anyone who likes to get up early?", "Why do people get up early?", "What kinds of occasions need people to arrive early?", "Why do some people like to stay up late?"]],
  ["Topic 35", ["Do Vietnamese people like to visit others' homes?", "What do Vietnamese people do when they visit others?", "What kind of place do people in your country like to live in?", "What's the difference between homes in cities and those in the countryside?"]],
  ["Topic 36", ["What are the popular water sports in your country?", "Are rivers and lakes important to a country?", "How can rivers and lakes benefit local people?", "Do you think rivers and lakes attract tourists?", "How do rivers and lakes affect local tourism?", "Are rivers and lakes good for transport? Why?"]],
  ["Topic 37", ["What kinds of facilities do big cities have?", "Do you think modern cities are suitable for young people or old people?", "Before you travel to a city, what factors would you consider?", "What are the disadvantages of living in a very famous city?", "Do you prefer to visit well-developed cities or cities with a long history?", "For those who live in cities, is it because they want to or have to?"]],
  ["Topic 38", ["Do you think parents should teach their children how to protect the environment?", "What laws about the environment are effective in your country?", "Which do you think people prefer, rewards or punishment, when it comes to government intervention in environmental protection?", "Is it easy for children in cities to get close to the natural world?", "What can people do to protect the natural world?", "Is it important to teach students environmental protection at school?"]],
  ["Topic 39", ["What short-term jobs do young people do in other countries?", "What challenges do young people face when working abroad?", "What are the benefits of working for an international company?", "What personal skills are required to work in an international company?", "What kind of work can young people do in foreign countries?", "Why are some people unwilling to work in other countries?"]],
  ["Topic 40", ["Should people prepare before giving advice?", "Is it good to ask advice from strangers online?", "What are the personalities of people whose job is to give advice to others?", "What are the problems if you ask too many people for advice?", "Why do some people think it is better to ask for advice from friends than from parents?", "When would old people ask young people for advice?"]],
  ["Topic 41", ["Do you think schools should teach children to do household chores?", "Why are employees reluctant to ask their managers for help?", "What can children do to help their parents?", "Should children help their parents with household chores?", "What kind of help do people need when looking for a new job?", "Who should people ask for help, colleagues or family members?"]],
  ["Topic 42", ["What kind of music events do people like today?", "Do you think children should receive some musical education?", "What are the differences between old and young people's music preferences?", "What kind of music events are there in your country?"]],
  ["Topic 43", ["Is it necessary to keep learning after graduating from school?", "Should teachers make learning in their classes fun?", "Do you think there are too many subjects for students to learn?", "Is it better to focus on a few subjects or to learn many subjects?", "Do you think enterprises should provide training for their employees?", "Do you think it is good for older adults to continue learning?"]],
  ["Topic 44", ["What are the differences between the technology of the past and that of today?", "What technology do young people like to use?", "What are the differences between online and face-to-face communication?", "Do you think technology has changed the way people communicate?", "What negative effects does technology have on people's relationships?", "What are the differences between making friends in real life and online?"]],
  ["Topic 45", ["What kind of job can be called a 'dream job'?", "What jobs do children want to do when they grow up?", "Do people's ideal jobs change as they grow up?", "What should people consider when choosing jobs?", "Is salary the main reason why people choose a certain job?", "What kind of jobs are the most popular in your country?"]],
  ["Topic 46", ["What is the right age for a child to learn drawing?", "Why do most children draw more often than adults do?", "Why do some people visit galleries or museums instead of viewing artworks online?", "Do you think galleries and museums should be free of charge?", "How do artworks inspire people?", "What are the differences between reading a book and visiting a museum?"]],
  ["Topic 47", ["What are the differences between old and young people when using apps?", "Why do some people not like using apps?", "What apps are popular in your country? Why?", "Should parents limit their children's use of computer programs and computer games? Why and how?", "Do you think young people are more and more reliant on these programs?"]],
  ["Topic 48", ["Do you think it's important to plan ahead?", "Do you think children should plan their future careers?", "Is making study plans popular among young people?", "Do you think choosing a college major is closely related to a person's future career?"]],
  ["Topic 49", ["What are the advantages and disadvantages of being a famous child?", "What can today's children do to become famous?", "What can children do with their fame?", "Do people become famous because of their talent?"]],
  ["Topic 50", ["Do you think it's reasonable to charge an entry fee for visiting interesting buildings?", "Is it better to live in a new building or an old one?", "What types of buildings are popular in your country?", "Is it worth spending a lot of money on the exterior appearance of a building?", "Is it more important for a building to look good on the outside or on the inside?", "Why do people like to visit historical sites?"]],
  ["Topic 51", ["What kinds of movies do you think are successful in your country?", "What are the factors that make a successful movie?", "Do Vietnamese people prefer to watch domestic movies or foreign movies?", "Do you think only well-known directors can create the best movies?", "Do you think successful movies should have well-known actors or actresses in leading roles?", "Why do people prefer to watch movies in the cinema?"]],
  ["Topic 52", ["Why do all children like toys?", "Do you think it is good for a child to always take his or her favourite toy with them all the time?", "Why are children attracted to new things (such as electronics)?", "Why do some grown-ups hate to throw out old things (such as clothes)?", "Is the way people buy things affected? How?", "What do you think influences people to buy new things?"]],
  ["Topic 53", ["What advantages can tourism bring to a city?", "Why do some young people like to live in cities?", "Do most elderly people live in the city or in the countryside?", "Do you think well-developed tourism will have negative effects on local people?", "What are the benefits of urbanization?", "Do you think the big cities in Vietnam today will become even larger in the future?"]],
  ["Topic 54", ["Do you think it is the rich people's responsibility to donate money to people in need?", "What kind of things are people happy to pay a high price for?", "Do you often buy more than you expected?", "What do you think young people spend most of their money on?", "Do you think it is important to save money? Why?", "Do people buy things they don't need?"]],
  ["Topic 55", ["When would parents feel proud of their children?", "Should parents reward children? Why and how?", "Is it good to reward children too often? Why?", "On what occasions would adults be proud of themselves?"]],
  ["Topic 56", ["Which form of vehicle is more popular in your country, bikes, cars or motorcycles?", "Do you think air pollution comes mostly from mobile vehicles?", "Do you think people need to change the way of transportation drastically to protect the environment?", "Why do people prefer to travel by car?", "How are the transportation systems in urban areas and rural areas different?"]],
  ["Topic 57", ["Do you think smart children are happier than other children?", "Is it important for schools to identify and develop each student's talents?", "Do you think children are born smart or they learn to become smart?", "How do children become smart at school?", "Why are some people well-rounded and others only good at one thing?", "Why does modern society need talents of all kinds?"]],
  ["Topic 58", ["Do people smile more when they are younger or older?", "Do you think people who like to smile are more friendly?", "Why do most people smile in photographs?", "Do women smile more than men? Why?"]],
  ["Topic 59", ["How do young and old people use mobile phones differently?", "What positive and negative impact do mobile phones have on friendship?", "Is it a waste of time to take pictures with mobile phones?", "Do you think it is necessary to have laws on the use of mobile phones?"]],
  ["Topic 60", ["Should children do everything their parents ask them to do?", "How can employers encourage their staff?", "How can leaders encourage their employees?", "When should parents encourage their children?", "What kind of encouragement should parents give?", "Do you think some people are better than others at persuading?"]],
  ["Topic 61", ["What things do families keep for a long time?", "What's the difference between things valued by people in the past and today?", "What kinds of things are kept in museums?", "What's the influence of technology on museums?"]],
  ["Topic 62", ["Do you think adults can have lots of imagination?", "Do you think imagination is essential for scientists?", "What kinds of jobs need imagination?", "What subjects are helpful for children's imagination?", "What games help develop children's imagination?", "How important is imagination to children?"]],
];

let idCounter = 0;
function nextId(prefix) {
  idCounter += 1;
  return `${prefix}-seed-${Date.now()}-${idCounter}`;
}

function buildTopics(list, { joinQuestions } = {}) {
  return list.map(([name, bullets]) => ({
    id: nextId("topic"),
    name,
    questions: joinQuestions
      ? [{ id: nextId("sq"), text: bullets.join(" • "), completed: false, userNote: "" }]
      : bullets.map((text) => ({ id: nextId("sq"), text, completed: false, userNote: "" })),
  }));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Run with --env-file=.env.local");
  }

  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`SELECT data FROM app_data WHERE id = 'planner'`;
  const current = rows[0]?.data;
  if (!current) {
    throw new Error("No existing planner row found in app_data");
  }

  const speakingTopics = current.speakingTopics || { part1: [], part2: [], part3: [] };

  const newPart1 = buildTopics(PART1);
  const newPart2 = buildTopics(PART2, { joinQuestions: true });
  const newPart3 = buildTopics(PART3);

  const updated = {
    ...current,
    speakingTopics: {
      part1: [...speakingTopics.part1, ...newPart1],
      part2: [...speakingTopics.part2, ...newPart2],
      part3: [...speakingTopics.part3, ...newPart3],
    },
  };

  await sql`
    UPDATE app_data SET data = ${JSON.stringify(updated)}::jsonb, updated_at = now()
    WHERE id = 'planner'
  `;

  console.log("Part1 topics added:", newPart1.length);
  console.log("Part2 topics added:", newPart2.length);
  console.log("Part3 topics added:", newPart3.length);
  console.log("Total questions added:", [...newPart1, ...newPart2, ...newPart3].reduce((sum, t) => sum + t.questions.length, 0));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
