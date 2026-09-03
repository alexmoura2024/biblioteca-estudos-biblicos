-- Fase 2 — Etapa 7: seed controlado e reproduzível.
--
-- ARQUIVO GERADO — não edite manualmente. Gerado por
-- scripts/generate-supabase-seed.ts a partir de
-- src/lib/data/{books,topics,characters,series,studies}.ts — os mesmos
-- dados mockados já validados pelos testes do motor em memória
-- (src/lib/data/*.test.ts). Para atualizar, edite os dados mockados e
-- rode `npm run db:generate-seed` de novo.
--
-- NÃO é o acervo real (DEC-006/DEC-011) — os mesmos estudos fictícios já
-- usados desde o Marco 1, incluindo ao menos um DRAFT e um REVIEW.
-- `supabase db reset` roda este arquivo depois das migrations.

begin;

-- books (66 livros)
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('3c07f1d3-363f-47af-9b75-6f8fc46c6c41', 'Gênesis', 'Gn', 'genesis', 'AT', 1, 50);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('8c938933-2888-49e1-b37d-93a7e5a8d8df', 'Êxodo', 'Êx', 'exodo', 'AT', 2, 40);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('a8ae9bf3-a371-4dd3-a01b-bd01d2b7ab6a', 'Levítico', 'Lv', 'levitico', 'AT', 3, 27);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('44f70613-ef93-4828-a738-a51732b17565', 'Números', 'Nm', 'numeros', 'AT', 4, 36);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('f59d02ed-2a76-417f-ba49-179f9241a525', 'Deuteronômio', 'Dt', 'deuteronomio', 'AT', 5, 34);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('2f33282d-36a7-4fe7-8845-64e95daa7ad5', 'Josué', 'Js', 'josue', 'AT', 6, 24);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('8271f5b7-db0a-4646-b049-9faca898867d', 'Juízes', 'Jz', 'juizes', 'AT', 7, 21);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('50050799-0469-48fa-af45-059b58049f5e', 'Rute', 'Rt', 'rute', 'AT', 8, 4);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('302642e7-32d4-4460-9468-2b9fac6ff545', '1 Samuel', '1Sm', '1-samuel', 'AT', 9, 31);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('98236e50-a9fe-430b-9830-8860d6a5716f', '2 Samuel', '2Sm', '2-samuel', 'AT', 10, 24);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('b87593a1-67c2-4fef-b411-6fd545e0bb0a', '1 Reis', '1Rs', '1-reis', 'AT', 11, 22);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('a599be92-cee8-4e9e-953a-6d00642d87d1', '2 Reis', '2Rs', '2-reis', 'AT', 12, 25);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('644788a8-1fe8-436c-a16e-b55dad09ea4a', '1 Crônicas', '1Cr', '1-cronicas', 'AT', 13, 29);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('72fe0568-af9f-4b02-97cc-ee8b85c2330e', '2 Crônicas', '2Cr', '2-cronicas', 'AT', 14, 36);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('4420f7fe-b4b2-4f74-ab0b-f04ff1ef1889', 'Esdras', 'Ed', 'esdras', 'AT', 15, 10);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('01e0f85c-ebc7-4c4c-9705-ef50e612e136', 'Neemias', 'Ne', 'neemias', 'AT', 16, 13);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('9da5439c-461f-4864-b581-5d701679e899', 'Ester', 'Et', 'ester', 'AT', 17, 10);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('6c0d973c-f2db-47aa-aebc-ca55b9b0797e', 'Jó', 'Jó', 'jo', 'AT', 18, 42);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('5ae013ea-64ce-44d5-9c05-2d4a7534154a', 'Salmos', 'Sl', 'salmos', 'AT', 19, 150);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('dc0b3fbd-8420-412f-a36c-41a507b85375', 'Provérbios', 'Pv', 'proverbios', 'AT', 20, 31);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('72a68d06-e04b-441f-96b7-8cb018420d2d', 'Eclesiastes', 'Ec', 'eclesiastes', 'AT', 21, 12);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('506e8f89-3718-4512-9fbf-37f19089be1e', 'Cânticos dos Cânticos', 'Ct', 'canticos-dos-canticos', 'AT', 22, 8);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('8cdd4aeb-5417-4765-a141-168985160bdb', 'Isaías', 'Is', 'isaias', 'AT', 23, 66);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('6a406f82-2782-4816-89be-141509dd0ae5', 'Jeremias', 'Jr', 'jeremias', 'AT', 24, 52);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('91e162cc-94af-41a2-a794-362fdc0a005f', 'Lamentações', 'Lm', 'lamentacoes', 'AT', 25, 5);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('880e0e81-b644-4a60-8d10-5f15ac9b623c', 'Ezequiel', 'Ez', 'ezequiel', 'AT', 26, 48);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('82faceb9-fbd8-46fe-92cc-979a9d21b59f', 'Daniel', 'Dn', 'daniel', 'AT', 27, 12);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('cddb181f-8105-4cd0-b0e8-9b7b0a0f44c0', 'Oséias', 'Os', 'oseias', 'AT', 28, 14);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('2508350c-6d49-457e-a4b9-0b83b1b33a56', 'Joel', 'Jl', 'joel', 'AT', 29, 3);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('16638088-caba-4908-a3f5-8bd4eb9d9cd4', 'Amós', 'Am', 'amos', 'AT', 30, 9);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('4121ce56-3178-466a-a2bb-2237759db145', 'Obadias', 'Ob', 'obadias', 'AT', 31, 1);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('81a3c829-e2d4-4e73-abab-8560b4018c53', 'Jonas', 'Jn', 'jonas', 'AT', 32, 4);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('b9350b65-15ba-437a-b4da-4740a3484642', 'Miquéias', 'Mq', 'miqueias', 'AT', 33, 7);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('6aca0033-c147-45ce-8ca9-7727c5d650be', 'Naum', 'Na', 'naum', 'AT', 34, 3);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('37431e46-b498-4301-b664-2ef6ef1f715b', 'Habacuque', 'Hc', 'habacuque', 'AT', 35, 3);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('a268f61a-8847-4d09-9bee-4fc6aea05aab', 'Sofonias', 'Sf', 'sofonias', 'AT', 36, 3);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('a3e627f4-7ad1-48eb-a679-bbf68ecff995', 'Ageu', 'Ag', 'ageu', 'AT', 37, 2);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('e1f04d92-3e25-49f6-b947-cf6ff2af4ec5', 'Zacarias', 'Zc', 'zacarias', 'AT', 38, 14);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('8187d52e-8d3d-43b4-ad48-b3c9109f6bbf', 'Malaquias', 'Ml', 'malaquias', 'AT', 39, 4);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('e01335d8-a718-4665-9c17-604050e9ebd6', 'Mateus', 'Mt', 'mateus', 'NT', 40, 28);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('621a9087-2ab9-4b74-9600-65d32db3fb9f', 'Marcos', 'Mc', 'marcos', 'NT', 41, 16);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('862fb14a-e314-4971-b726-03b40d8a72cd', 'Lucas', 'Lc', 'lucas', 'NT', 42, 24);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('ef4c95c3-418b-4868-9cb9-0e07b2c481be', 'João', 'Jo', 'joao', 'NT', 43, 21);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('cf0b4cd5-5913-4a49-96f1-b90f53373ea7', 'Atos', 'At', 'atos', 'NT', 44, 28);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('018365c6-59c8-4327-91ef-806c483c567c', 'Romanos', 'Rm', 'romanos', 'NT', 45, 16);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('945fdafa-6212-4eea-8e0a-b2b74de5bf04', '1 Coríntios', '1Co', '1-corintios', 'NT', 46, 16);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('c8a77fd7-3b64-40b0-91e4-bad6d27f224b', '2 Coríntios', '2Co', '2-corintios', 'NT', 47, 13);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('418d48b0-30d5-4a59-b60a-36628fc36c1c', 'Gálatas', 'Gl', 'galatas', 'NT', 48, 6);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('4494fcd5-15ad-4a52-a207-bc998754b441', 'Efésios', 'Ef', 'efesios', 'NT', 49, 6);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('8ac5a357-c25f-43c2-8c14-1f835fe00e62', 'Filipenses', 'Fp', 'filipenses', 'NT', 50, 4);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('78eef7d1-2bae-445b-964f-ff322023c70d', 'Colossenses', 'Cl', 'colossenses', 'NT', 51, 4);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('501d9794-4433-4230-ac83-22d329149d3c', '1 Tessalonicenses', '1Ts', '1-tessalonicenses', 'NT', 52, 5);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('eb2f627a-be2a-49bc-b309-c63b673d93df', '2 Tessalonicenses', '2Ts', '2-tessalonicenses', 'NT', 53, 3);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('2dac0237-6193-4f20-922d-2b56b9c5af8a', '1 Timóteo', '1Tm', '1-timoteo', 'NT', 54, 6);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('57e069b6-141e-4772-8f62-e1aeb32e349c', '2 Timóteo', '2Tm', '2-timoteo', 'NT', 55, 4);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('daea9034-ac60-4e24-8b2a-add7295875e0', 'Tito', 'Tt', 'tito', 'NT', 56, 3);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('736db391-f539-48d1-9c92-06966f45400b', 'Filemom', 'Fm', 'filemom', 'NT', 57, 1);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('508bd724-f2d6-4b42-9638-4c3949b1846d', 'Hebreus', 'Hb', 'hebreus', 'NT', 58, 13);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('3b2eed83-8a56-4c3a-8832-a7049e70026b', 'Tiago', 'Tg', 'tiago', 'NT', 59, 5);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('77789bac-594a-4117-97bc-bb8bddf36fdc', '1 Pedro', '1Pe', '1-pedro', 'NT', 60, 5);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('02c693ec-1d2d-4437-b1f2-1e020b513c38', '2 Pedro', '2Pe', '2-pedro', 'NT', 61, 3);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('8b95d6cf-92db-4af4-8237-ba38e3cb3e64', '1 João', '1Jo', '1-joao', 'NT', 62, 5);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('ed9b5230-5fb9-48f3-b2d1-11537bd3b33f', '2 João', '2Jo', '2-joao', 'NT', 63, 1);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('107b92c0-37bb-491c-bf14-2e0913c2564a', '3 João', '3Jo', '3-joao', 'NT', 64, 1);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('48886e83-f428-4076-af88-6da315534297', 'Judas', 'Jd', 'judas', 'NT', 65, 1);
insert into public.books (id, nome, abreviacao, slug, testamento, ordem_canonica, total_capitulos) values ('94e671ad-d695-4afe-bf76-6b7a43c397b8', 'Apocalipse', 'Ap', 'apocalipse', 'NT', 66, 22);

-- topics
insert into public.topics (id, nome, slug, descricao) values ('2f299c9f-448a-41a8-ae03-0a9f2c5eed7c', 'Fé', 'fe', 'Confiança em Deus mesmo diante do que ainda não se vê.');
insert into public.topics (id, nome, slug, descricao) values ('f1386718-1c55-4d56-9317-38b8bbddaa60', 'Oração', 'oracao', 'A prática de comunhão e diálogo com Deus.');
insert into public.topics (id, nome, slug, descricao) values ('6669416d-5b53-447a-938e-ac5f0c93a8c1', 'Graça', 'graca', 'O favor imerecido de Deus para com a humanidade.');
insert into public.topics (id, nome, slug, descricao) values ('5a82d3bb-82db-4850-b8ff-c22e933bf78d', 'Perdão', 'perdao', 'A restauração de relacionamentos rompidos pelo pecado.');
insert into public.topics (id, nome, slug, descricao) values ('62894a42-b383-46da-a7d1-26fb45286768', 'Esperança', 'esperanca', 'A expectativa segura nas promessas de Deus.');
insert into public.topics (id, nome, slug, descricao) values ('14abff9f-1290-4167-865f-47cfab0a5e8b', 'Sofrimento e confiança', 'sofrimento-e-confianca', 'Como manter a fé diante da dor e da adversidade.');
insert into public.topics (id, nome, slug, descricao) values ('b1c19704-a984-466e-bdb8-e9f6a306ab56', 'Amor', 'amor', 'O maior mandamento e o caráter de Deus revelado em Cristo.');
insert into public.topics (id, nome, slug, descricao) values ('31aa3322-a54d-4cbf-bc54-205af035e775', 'Obediência', 'obediencia', 'A resposta prática de submissão à vontade de Deus.');
insert into public.topics (id, nome, slug, descricao) values ('004a874c-9b8d-4c53-b142-7ff68bf519f9', 'Misericórdia', 'misericordia', 'A compaixão de Deus que se estende aos necessitados.');
insert into public.topics (id, nome, slug, descricao) values ('ad775482-7dcb-4482-9608-c630f9743ba7', 'Segunda vinda', 'segunda-vinda', 'O retorno prometido de Cristo e a esperança escatológica.');
insert into public.topics (id, nome, slug, descricao) values ('6ae24085-6eb2-4526-a870-b64d5a3643e5', 'Liderança', 'lideranca', 'Princípios bíblicos para guiar e servir pessoas.');
insert into public.topics (id, nome, slug, descricao) values ('f63af7ee-d213-408f-b802-ef540826bbcc', 'Família', 'familia', 'Relações familiares à luz dos princípios bíblicos.');

-- characters
insert into public.characters (id, nome, slug, descricao) values ('468eb7bd-6225-4a46-83e5-c07aae67d073', 'Abraão', 'abraao', 'Patriarca chamado por Deus a deixar sua terra e pai de uma grande nação.');
insert into public.characters (id, nome, slug, descricao) values ('cc4cdcfa-c26d-4c05-853c-33d11c05fada', 'Moisés', 'moises', 'Libertador de Israel e mediador da aliança no Sinai.');
insert into public.characters (id, nome, slug, descricao) values ('cef03206-8458-40eb-9e96-d9e80093628d', 'Davi', 'davi', 'Rei de Israel, pastor, guerreiro e salmista.');
insert into public.characters (id, nome, slug, descricao) values ('8bb6ea96-6405-4dc4-815c-b75cb829f568', 'Jó', 'jo', 'Homem íntegro que manteve a fé em meio a grande sofrimento.');
insert into public.characters (id, nome, slug, descricao) values ('5847f25b-7c8a-4ae0-8d96-6a3fff40b600', 'Rute', 'rute', 'Moabita fiel cuja lealdade se tornou exemplo de graça.');
insert into public.characters (id, nome, slug, descricao) values ('9eb99bb7-bb62-4cb9-a193-588f8b58ad27', 'Isaías', 'isaias', 'Profeta do Antigo Testamento que anunciou juízo e restauração.');
insert into public.characters (id, nome, slug, descricao) values ('5fb84dee-477b-4642-8fa0-140508aa00f5', 'Jesus', 'jesus', 'Centro da revelação bíblica; Cristo, o Filho de Deus encarnado.');
insert into public.characters (id, nome, slug, descricao) values ('bd845b57-44fc-4577-adeb-44fa42325e65', 'Maria', 'maria', 'Mãe de Jesus, exemplo de submissão à vontade de Deus.');
insert into public.characters (id, nome, slug, descricao) values ('f74337de-f829-4745-9a04-c9510f19b53c', 'Pedro', 'pedro', 'Discípulo e apóstolo, líder da igreja primitiva.');
insert into public.characters (id, nome, slug, descricao) values ('15dfbb6a-e2b3-4d6b-913c-182854a17f5d', 'Paulo', 'paulo', 'Apóstolo aos gentios e autor de diversas cartas do Novo Testamento.');
insert into public.characters (id, nome, slug, descricao) values ('c0e4c93f-dafc-46a0-a448-e8653bb445e1', 'João', 'joao', 'Apóstolo amado, autor do quarto evangelho e do Apocalipse.');
insert into public.characters (id, nome, slug, descricao) values ('e0620473-8d58-4118-a8a3-b55bf26643c2', 'Tiago', 'tiago', 'Líder da igreja em Jerusalém e autor da epístola que leva seu nome.');

-- series
insert into public.series (id, nome, slug, descricao) values ('4963ada3-d1b8-456d-b824-2e361b4d6b78', 'Fundamentos da Fé', 'fundamentos-da-fe', 'Uma introdução aos temas essenciais da vida cristã.');
insert into public.series (id, nome, slug, descricao) values ('5e5cf449-c8dc-4876-80fe-787ef5107a9f', 'Vida de Davi', 'vida-de-davi', 'Estudos sobre a trajetória do rei Davi, do campo ao trono.');
insert into public.series (id, nome, slug, descricao) values ('52f8e1b5-fa45-4aa6-ad6c-3a68f8f97103', 'Cartas de Paulo', 'cartas-de-paulo', 'Percorrendo as epístolas paulinas e sua teologia prática.');
insert into public.series (id, nome, slug, descricao) values ('73fd9e85-ecb7-4b3e-8d9e-c4ad3ed10b57', 'Parábolas de Jesus', 'parabolas-de-jesus', 'Estudos sobre os ensinamentos de Jesus em forma de parábola.');

-- studies (com passagens, temas, personagens e séries) — um bloco por estudo
-- A fé que responde ao chamado [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('29c5258b-6f91-4c83-94f0-6430e4e9d4a7', 'A fé que responde ao chamado', 'a-fe-que-responde-ao-chamado', 'Como o chamado de Deus a Abraão, em Gênesis 12, convida à saída da segurança conhecida rumo à promessa.', 'Em Gênesis 12, Deus chama Abrão a deixar sua terra, sua parentela e a casa de seu pai rumo a uma terra que lhe seria mostrada. Não há mapa, apenas uma promessa.

A fé de Abrão não elimina a incerteza do caminho; ela responde a uma palavra confiável antes de qualquer confirmação visível. Esse é o padrão que atravessa toda a narrativa bíblica da fé.

Para o leitor de hoje, o texto convida a reconhecer que obedecer a Deus frequentemente significa caminhar antes de enxergar o destino completo — sustentado pelo caráter de quem chama, não pelas circunstâncias.', 'PUBLISHED', 'publico', 'Equipe Editorial', '2024-02-10', ARRAY['chamado', 'promessa', 'peregrinação', 'aliança']::text[], '2024-02-10T09:00:00.000Z', '2024-02-10T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('52da88c6-ed57-42a6-ba3f-f09e7b0a6ec2', '3c07f1d3-363f-47af-9b75-6f8fc46c6c41', 12, 1, 9, 'Gênesis 12:1-9');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('29c5258b-6f91-4c83-94f0-6430e4e9d4a7', '52da88c6-ed57-42a6-ba3f-f09e7b0a6ec2', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('29c5258b-6f91-4c83-94f0-6430e4e9d4a7', '2f299c9f-448a-41a8-ae03-0a9f2c5eed7c', 3);
insert into public.study_characters (study_id, character_id, papel) values ('29c5258b-6f91-4c83-94f0-6430e4e9d4a7', '468eb7bd-6225-4a46-83e5-c07aae67d073', 'protagonista');

-- Provação e provisão no monte Moriá [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('e8eb140b-a500-4840-bfea-2d1348b47bdb', 'Provação e provisão no monte Moriá', 'provacao-e-provisao-no-monte-moria', 'Um estudo sobre Gênesis 22 e a tensão entre a exigência divina, a obediência de Abraão e a provisão de Deus.', 'Gênesis 22 narra o episódio mais tenso da vida de Abraão: a ordem para oferecer Isaque, o filho da promessa, em sacrifício.

A obediência de Abraão não é cega — é construída sobre décadas de experiência com a fidelidade de Deus, expressa na afirmação de que ''Deus proverá'' (v. 8).

O carneiro preso no matagal, oferecido no lugar de Isaque, antecipa um princípio que percorre toda a Escritura: Deus mesmo provê o sacrifício que a obediência humana não poderia produzir.', 'PUBLISHED', 'publico', 'Pr. José Ricardo Alves', '2024-02-24', ARRAY['sacrifício', 'provisão', 'monte moriá', 'Isaque']::text[], '2024-02-24T09:00:00.000Z', '2024-02-24T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('2c4ad2e4-8ce1-4f1f-a170-0318c0e073f9', '3c07f1d3-363f-47af-9b75-6f8fc46c6c41', 22, 1, 19, 'Gênesis 22:1-19');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('e8eb140b-a500-4840-bfea-2d1348b47bdb', '2c4ad2e4-8ce1-4f1f-a170-0318c0e073f9', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('e8eb140b-a500-4840-bfea-2d1348b47bdb', '2f299c9f-448a-41a8-ae03-0a9f2c5eed7c', 2);
insert into public.study_topics (study_id, topic_id, peso) values ('e8eb140b-a500-4840-bfea-2d1348b47bdb', '31aa3322-a54d-4cbf-bc54-205af035e775', 3);
insert into public.study_characters (study_id, character_id, papel) values ('e8eb140b-a500-4840-bfea-2d1348b47bdb', '468eb7bd-6225-4a46-83e5-c07aae67d073', 'protagonista');

-- A sarça ardente e o chamado de Moisés [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('aef5f809-1af3-42c2-95ea-d7ebd6eb55e6', 'A sarça ardente e o chamado de Moisés', 'a-sarca-ardente-e-o-chamado-de-moises', 'Êxodo 3 apresenta o encontro de Moisés com Deus na sarça ardente e o envio para libertar o povo de Israel.', 'No deserto de Midiã, Moisés se depara com uma sarça que arde sem se consumir — um sinal da presença santa de Deus em meio ao comum.

Deus se revela como ''EU SOU O QUE SOU'' e comissiona Moisés, apesar de suas objeções, para liderar a libertação de Israel do Egito.

O texto ensina que a liderança bíblica nasce do encontro com Deus, não da autoconfiança: Moisés é enviado com a garantia ''Eu serei contigo'' (v. 12).', 'PUBLISHED', 'publico', 'Profa. Marta Nascimento', '2024-03-02', ARRAY['chamado', 'libertação', 'presença', 'nome de Deus']::text[], '2024-03-02T09:00:00.000Z', '2024-03-02T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('d359b25d-1dd6-48e6-a4e9-e994ee458cea', '8c938933-2888-49e1-b37d-93a7e5a8d8df', 3, 1, 15, 'Êxodo 3:1-15');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('aef5f809-1af3-42c2-95ea-d7ebd6eb55e6', 'd359b25d-1dd6-48e6-a4e9-e994ee458cea', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('aef5f809-1af3-42c2-95ea-d7ebd6eb55e6', '31aa3322-a54d-4cbf-bc54-205af035e775', 2);
insert into public.study_topics (study_id, topic_id, peso) values ('aef5f809-1af3-42c2-95ea-d7ebd6eb55e6', '6ae24085-6eb2-4526-a870-b64d5a3643e5', 3);
insert into public.study_characters (study_id, character_id, papel) values ('aef5f809-1af3-42c2-95ea-d7ebd6eb55e6', 'cc4cdcfa-c26d-4c05-853c-33d11c05fada', 'protagonista');

-- Lealdade e redenção no livro de Rute [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('e5695f85-2ae7-4fdb-a194-90718d092612', 'Lealdade e redenção no livro de Rute', 'lealdade-e-redencao-no-livro-de-rute', 'A decisão de Rute de permanecer com Noemi inaugura uma história de lealdade que desemboca em redenção.', 'Diante da perda e da possibilidade de voltar para o próprio povo, Rute escolhe permanecer ao lado de Noemi: ''Aonde quer que tu fores, irei eu'' (1:16).

Essa lealdade, aparentemente pequena, é o fio que conduz à redenção da família por meio de Boaz, o parente-resgatador.

O livro de Rute mostra como a fidelidade cotidiana, praticada sem grandes sinais, é usada por Deus para tecer sua obra redentora ao longo das gerações.', 'PUBLISHED', 'publico', 'Equipe Editorial', '2024-03-15', ARRAY['lealdade', 'redenção', 'família', 'parente-resgatador']::text[], '2024-03-15T09:00:00.000Z', '2024-03-15T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('46ab0b5c-db03-4171-bddf-ef44f4ba4105', '50050799-0469-48fa-af45-059b58049f5e', 1, 1, 18, 'Rute 1:1-18');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('e5695f85-2ae7-4fdb-a194-90718d092612', '46ab0b5c-db03-4171-bddf-ef44f4ba4105', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('e5695f85-2ae7-4fdb-a194-90718d092612', '6669416d-5b53-447a-938e-ac5f0c93a8c1', 3);
insert into public.study_topics (study_id, topic_id, peso) values ('e5695f85-2ae7-4fdb-a194-90718d092612', 'f63af7ee-d213-408f-b802-ef540826bbcc', 2);
insert into public.study_characters (study_id, character_id, papel) values ('e5695f85-2ae7-4fdb-a194-90718d092612', '5847f25b-7c8a-4ae0-8d96-6a3fff40b600', 'protagonista');

-- Davi e Golias: fé contra o gigante [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('f0a5b58b-b8ce-4548-90f6-47bfcbb37700', 'Davi e Golias: fé contra o gigante', 'davi-e-golias-fe-contra-o-gigante', 'O confronto entre Davi e Golias em 1 Samuel 17 revela uma fé que enxerga além do tamanho do problema.', 'Enquanto o exército de Israel treme diante de Golias, o jovem Davi enxerga o desafio a partir de outra referência: ''quem é este filisteu incircunciso, para afrontar os exércitos do Deus vivo?'' (17:26).

Davi não nega o perigo; ele o interpreta à luz do caráter de Deus, lembrando as vitórias passadas sobre o leão e o urso.

A vitória de Davi, sem a armadura de Saul, ensina que a confiança bíblica não depende de recursos proporcionais ao problema, mas da fidelidade de Deus.', 'PUBLISHED', 'publico', 'Pr. José Ricardo Alves', '2024-04-05', ARRAY['Golias', 'gigante', 'confiança', 'batalha']::text[], '2024-04-05T09:00:00.000Z', '2024-04-05T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('628c0a78-2f80-40bd-b36d-0dbb9df61cfc', '302642e7-32d4-4460-9468-2b9fac6ff545', 17, 32, 50, '1 Samuel 17:32-50');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('f0a5b58b-b8ce-4548-90f6-47bfcbb37700', '628c0a78-2f80-40bd-b36d-0dbb9df61cfc', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('f0a5b58b-b8ce-4548-90f6-47bfcbb37700', '2f299c9f-448a-41a8-ae03-0a9f2c5eed7c', 3);
insert into public.study_characters (study_id, character_id, papel) values ('f0a5b58b-b8ce-4548-90f6-47bfcbb37700', 'cef03206-8458-40eb-9e96-d9e80093628d', 'protagonista');
insert into public.study_series (study_id, series_id, ordem) values ('f0a5b58b-b8ce-4548-90f6-47bfcbb37700', '5e5cf449-c8dc-4876-80fe-787ef5107a9f', 1);

-- Davi, Natã e o arrependimento [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('abbdab2b-249b-4024-ae5e-95b4a984f997', 'Davi, Natã e o arrependimento', 'davi-nata-e-o-arrependimento', 'Após o pecado com Bate-Seba, o confronto do profeta Natã leva Davi a um arrependimento genuíno em 2 Samuel 12.', 'O profeta Natã confronta Davi com uma parábola sobre um cordeirinho roubado, levando o rei a reconhecer: ''Pequei contra o Senhor'' (12:13).

O texto não minimiza a gravidade do pecado nem suas consequências, mas também não esconde a resposta de Deus ao arrependimento sincero.

Este episódio, lido ao lado do Salmo 51, mostra o caminho bíblico entre a queda e a restauração: confissão sem desculpas e confiança na misericórdia de Deus.', 'PUBLISHED', 'publico', 'Profa. Marta Nascimento', '2024-04-19', ARRAY['arrependimento', 'confissão', 'Natã', 'Bate-Seba']::text[], '2024-04-19T09:00:00.000Z', '2024-04-19T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('6c1e430b-0ad3-406d-ab59-42e848a4d5b5', '98236e50-a9fe-430b-9830-8860d6a5716f', 12, 1, 13, '2 Samuel 12:1-13');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('abbdab2b-249b-4024-ae5e-95b4a984f997', '6c1e430b-0ad3-406d-ab59-42e848a4d5b5', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('abbdab2b-249b-4024-ae5e-95b4a984f997', '5a82d3bb-82db-4850-b8ff-c22e933bf78d', 3);
insert into public.study_characters (study_id, character_id, papel) values ('abbdab2b-249b-4024-ae5e-95b4a984f997', 'cef03206-8458-40eb-9e96-d9e80093628d', 'protagonista');
insert into public.study_series (study_id, series_id, ordem) values ('abbdab2b-249b-4024-ae5e-95b4a984f997', '5e5cf449-c8dc-4876-80fe-787ef5107a9f', 2);

-- O Senhor é o meu pastor [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('2a9f6496-df06-4896-829e-d3b1eddbcbe4', 'O Senhor é o meu pastor', 'o-senhor-e-o-meu-pastor', 'O Salmo 23 descreve o cuidado de Deus como o de um pastor que guia, conforta e sustenta em toda circunstância.', 'Davi, que foi pastor antes de ser rei, descreve sua relação com Deus usando a imagem mais próxima de sua própria experiência: ''O Senhor é o meu pastor; nada me faltará'' (v. 1).

O salmo percorre vales sombrios e mesas preparadas ''na presença dos meus inimigos'', mostrando que o cuidado de Deus não elimina a dificuldade, mas a atravessa ao lado do crente.

É um dos textos mais lidos da Bíblia justamente por unir, em poucos versos, confiança, provisão e esperança futura (''habitarei na casa do Senhor por longos dias'').', 'PUBLISHED', 'publico', 'Equipe Editorial', '2024-05-01', ARRAY['pastor', 'confiança', 'provisão', 'salmo']::text[], '2024-05-01T09:00:00.000Z', '2024-05-01T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('0dd5d51a-a00c-45a9-8b13-5acc722ca906', '5ae013ea-64ce-44d5-9c05-2d4a7534154a', 23, 1, 6, 'Salmos 23:1-6');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('2a9f6496-df06-4896-829e-d3b1eddbcbe4', '0dd5d51a-a00c-45a9-8b13-5acc722ca906', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('2a9f6496-df06-4896-829e-d3b1eddbcbe4', '62894a42-b383-46da-a7d1-26fb45286768', 2);
insert into public.study_topics (study_id, topic_id, peso) values ('2a9f6496-df06-4896-829e-d3b1eddbcbe4', '2f299c9f-448a-41a8-ae03-0a9f2c5eed7c', 2);
insert into public.study_characters (study_id, character_id, papel) values ('2a9f6496-df06-4896-829e-d3b1eddbcbe4', 'cef03206-8458-40eb-9e96-d9e80093628d', 'autor');

-- Sofrimento e integridade: o caso de Jó [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('9295a7d0-aecd-48fe-9126-cdd7101b2ab4', 'Sofrimento e integridade: o caso de Jó', 'sofrimento-e-integridade-o-caso-de-jo', 'Jó perde tudo em um único dia, mas sua resposta inicial revela uma fé que não depende das circunstâncias.', 'Em rápida sucessão, Jó recebe notícias da perda de seus bens e de seus dez filhos. Sua resposta é ao mesmo tempo dolorosa e surpreendente: ''o Senhor deu, o Senhor tirou; bendito seja o nome do Senhor'' (1:21).

O livro de Jó não oferece uma explicação simples para o sofrimento; ele resiste às respostas fáceis dos amigos de Jó ao longo dos capítulos seguintes.

O que o texto oferece, já em seu início, é o retrato de uma integridade que não condiciona a adoração a Deus aos resultados visíveis da vida.', 'PUBLISHED', 'publico', 'Pr. José Ricardo Alves', '2024-05-12', ARRAY['sofrimento', 'integridade', 'perda', 'lamento']::text[], '2024-05-12T09:00:00.000Z', '2024-05-12T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('b0537b07-ee41-4faa-84d4-d7769b19cfe1', '6c0d973c-f2db-47aa-aebc-ca55b9b0797e', 1, 13, 22, 'Jó 1:13-22');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('9295a7d0-aecd-48fe-9126-cdd7101b2ab4', 'b0537b07-ee41-4faa-84d4-d7769b19cfe1', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('9295a7d0-aecd-48fe-9126-cdd7101b2ab4', '14abff9f-1290-4167-865f-47cfab0a5e8b', 3);
insert into public.study_characters (study_id, character_id, papel) values ('9295a7d0-aecd-48fe-9126-cdd7101b2ab4', '8bb6ea96-6405-4dc4-815c-b75cb829f568', 'protagonista');

-- Confiança e sabedoria em Provérbios 3 [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('88fafda5-c078-462b-a595-cfb9ea2fad84', 'Confiança e sabedoria em Provérbios 3', 'confianca-e-sabedoria-em-proverbios-3', 'Provérbios 3 ensina a confiar no Senhor de todo o coração, em vez de se apoiar apenas no próprio entendimento.', 'O texto exorta: ''Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento'' (3:5), estabelecendo um princípio central da sabedoria bíblica.

Confiança e obediência aparecem lado a lado: reconhecer a Deus ''em todos os teus caminhos'' é o que endireita as veredas.

O capítulo também liga sabedoria a atitudes práticas — honrar a Deus com os bens, não desprezar a disciplina e buscar a paz com o próximo.', 'PUBLISHED', 'publico', 'Profa. Marta Nascimento', '2024-05-20', ARRAY['sabedoria', 'confiança', 'entendimento', 'caminhos']::text[], '2024-05-20T09:00:00.000Z', '2024-05-20T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('c21d5a05-409b-4499-9317-a7822e8b81b7', 'dc0b3fbd-8420-412f-a36c-41a507b85375', 3, 1, 12, 'Provérbios 3:1-12');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('88fafda5-c078-462b-a595-cfb9ea2fad84', 'c21d5a05-409b-4499-9317-a7822e8b81b7', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('88fafda5-c078-462b-a595-cfb9ea2fad84', '2f299c9f-448a-41a8-ae03-0a9f2c5eed7c', 2);
insert into public.study_topics (study_id, topic_id, peso) values ('88fafda5-c078-462b-a595-cfb9ea2fad84', '31aa3322-a54d-4cbf-bc54-205af035e775', 2);

-- O Servo Sofredor em Isaías 53 [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('aa523d4f-b08e-42f6-bb0b-b51009cd3cb5', 'O Servo Sofredor em Isaías 53', 'o-servo-sofredor-em-isaias-53', 'Isaías 53 antecipa a figura de um servo que sofre pelos pecados de outros, um dos textos messiânicos mais centrais do Antigo Testamento.', 'O profeta descreve alguém ''desprezado e rejeitado'', ''traspassado pelas nossas transgressões'' — uma figura de sofrimento vicário que carrega o peso alheio.

A leitura cristã histórica identifica esse Servo com Jesus, cujo sofrimento é interpretado à luz destas palavras escritas séculos antes.

Independentemente da época de leitura, o capítulo oferece uma das imagens mais profundas de esperança: ''pelas suas pisaduras fomos sarados'' (v. 5).', 'PUBLISHED', 'publico', 'Equipe Editorial', '2024-06-02', ARRAY['servo sofredor', 'profecia', 'messias', 'sofrimento vicário']::text[], '2024-06-02T09:00:00.000Z', '2024-06-02T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('6dd79dac-a275-496e-8c61-1517e642d4e5', '8cdd4aeb-5417-4765-a141-168985160bdb', 53, 1, 12, 'Isaías 53:1-12');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('aa523d4f-b08e-42f6-bb0b-b51009cd3cb5', '6dd79dac-a275-496e-8c61-1517e642d4e5', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('aa523d4f-b08e-42f6-bb0b-b51009cd3cb5', '62894a42-b383-46da-a7d1-26fb45286768', 3);
insert into public.study_characters (study_id, character_id, papel) values ('aa523d4f-b08e-42f6-bb0b-b51009cd3cb5', '9eb99bb7-bb62-4cb9-a193-588f8b58ad27', 'autor');
insert into public.study_characters (study_id, character_id, papel) values ('aa523d4f-b08e-42f6-bb0b-b51009cd3cb5', '5fb84dee-477b-4642-8fa0-140508aa00f5', 'mencionado');

-- A parábola do semeador [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('af338573-fde0-4bb1-8eda-8b27be72e017', 'A parábola do semeador', 'a-parabola-do-semeador', 'Em Mateus 13, Jesus ensina sobre os diferentes tipos de solo como imagem para os modos de receber a Palavra.', 'A parábola do semeador descreve quatro tipos de terreno — a beira do caminho, o pedregal, os espinhos e a boa terra — como figuras para diferentes respostas à Palavra de Deus.

Jesus explica a parábola aos discípulos em particular, revelando que o fruto depende não apenas da semente, mas da condição do coração que a recebe.

O texto convida à autoavaliação: que tipo de solo tem sido o coração do leitor diante do que ouve e lê da Palavra?', 'PUBLISHED', 'publico', 'Pr. José Ricardo Alves', '2024-06-14', ARRAY['parábola', 'semeador', 'solo', 'palavra']::text[], '2024-06-14T09:00:00.000Z', '2024-06-14T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('b865fcc1-c11f-4892-b53f-32bfb0f1e088', 'e01335d8-a718-4665-9c17-604050e9ebd6', 13, 1, 23, 'Mateus 13:1-23');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('af338573-fde0-4bb1-8eda-8b27be72e017', 'b865fcc1-c11f-4892-b53f-32bfb0f1e088', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('af338573-fde0-4bb1-8eda-8b27be72e017', '2f299c9f-448a-41a8-ae03-0a9f2c5eed7c', 2);
insert into public.study_characters (study_id, character_id, papel) values ('af338573-fde0-4bb1-8eda-8b27be72e017', '5fb84dee-477b-4642-8fa0-140508aa00f5', 'protagonista');
insert into public.study_series (study_id, series_id, ordem) values ('af338573-fde0-4bb1-8eda-8b27be72e017', '73fd9e85-ecb7-4b3e-8d9e-c4ad3ed10b57', 1);

-- A parábola do filho pródigo [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('f6ed5c32-cd52-4ad3-b036-87ccec0541eb', 'A parábola do filho pródigo', 'a-parabola-do-filho-prodigo', 'Lucas 15 narra a história do filho que retorna e do pai que corre ao seu encontro — um retrato da graça que perdoa.', 'O filho mais novo pede sua herança, parte para uma terra distante e desperdiça tudo o que tinha — até se ver reduzido a alimentar porcos.

Ao voltar ''em si'', ele decide retornar, ensaiando um pedido de perdão. O pai, porém, o vê ''ainda longe'' e corre ao seu encontro antes de qualquer palavra.

A parábola termina com a resistência do irmão mais velho, ampliando o convite: a graça do pai se estende tanto ao que se perdeu longe quanto ao que resiste perto.', 'PUBLISHED', 'publico', 'Profa. Marta Nascimento', '2024-06-28', ARRAY['filho pródigo', 'graça', 'arrependimento', 'pai']::text[], '2024-06-28T09:00:00.000Z', '2024-06-28T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('61d76aa5-e40c-4423-b2d5-26dec30ea6ba', '862fb14a-e314-4971-b726-03b40d8a72cd', 15, 11, 32, 'Lucas 15:11-32');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('f6ed5c32-cd52-4ad3-b036-87ccec0541eb', '61d76aa5-e40c-4423-b2d5-26dec30ea6ba', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('f6ed5c32-cd52-4ad3-b036-87ccec0541eb', '6669416d-5b53-447a-938e-ac5f0c93a8c1', 3);
insert into public.study_topics (study_id, topic_id, peso) values ('f6ed5c32-cd52-4ad3-b036-87ccec0541eb', '5a82d3bb-82db-4850-b8ff-c22e933bf78d', 2);
insert into public.study_characters (study_id, character_id, papel) values ('f6ed5c32-cd52-4ad3-b036-87ccec0541eb', '5fb84dee-477b-4642-8fa0-140508aa00f5', 'narrador');
insert into public.study_series (study_id, series_id, ordem) values ('f6ed5c32-cd52-4ad3-b036-87ccec0541eb', '73fd9e85-ecb7-4b3e-8d9e-c4ad3ed10b57', 2);

-- O bom samaritano e o mandamento do amor [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('300b739d-4844-44da-b4ed-ee0feebb1792', 'O bom samaritano e o mandamento do amor', 'o-bom-samaritano-e-o-mandamento-do-amor', 'Diante da pergunta ''quem é o meu próximo?'', Jesus responde com a parábola do bom samaritano em Lucas 10.', 'Um homem é espancado e deixado à beira do caminho; um sacerdote e um levita passam sem ajudar, mas um samaritano — figura desprezada pelos ouvintes judeus — para e cuida dele.

Jesus inverte a pergunta original do intérprete da lei: em vez de definir quem é o próximo, ele pergunta quem agiu como próximo.

A parábola redefine o amor ao próximo como uma prática que atravessa fronteiras étnicas e religiosas, fundada na compaixão concreta, não na proximidade social.', 'PUBLISHED', 'publico', 'Equipe Editorial', '2024-07-10', ARRAY['bom samaritano', 'próximo', 'compaixão', 'lei']::text[], '2024-07-10T09:00:00.000Z', '2024-07-10T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('75d5e779-df4f-4ceb-8a97-03623a1b0665', '862fb14a-e314-4971-b726-03b40d8a72cd', 10, 25, 37, 'Lucas 10:25-37');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('300b739d-4844-44da-b4ed-ee0feebb1792', '75d5e779-df4f-4ceb-8a97-03623a1b0665', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('300b739d-4844-44da-b4ed-ee0feebb1792', 'b1c19704-a984-466e-bdb8-e9f6a306ab56', 3);
insert into public.study_characters (study_id, character_id, papel) values ('300b739d-4844-44da-b4ed-ee0feebb1792', '5fb84dee-477b-4642-8fa0-140508aa00f5', 'narrador');
insert into public.study_series (study_id, series_id, ordem) values ('300b739d-4844-44da-b4ed-ee0feebb1792', '73fd9e85-ecb7-4b3e-8d9e-c4ad3ed10b57', 3);

-- Nicodemos e o novo nascimento [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('3d5e7626-846a-468c-b780-af52dcb8b96d', 'Nicodemos e o novo nascimento', 'nicodemos-e-o-novo-nascimento', 'No diálogo noturno com Nicodemos, Jesus fala sobre nascer de novo e do amor de Deus revelado em João 3:16.', 'Nicodemos, um mestre respeitado em Israel, procura Jesus à noite com perguntas sinceras sobre o Reino de Deus.

Jesus responde com a necessidade de um novo nascimento, ''da água e do Espírito'', deslocando a discussão do mérito religioso para uma obra de Deus.

O diálogo culmina no versículo mais citado do Novo Testamento: ''Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito...'' (3:16), que resume o evangelho em uma frase.', 'PUBLISHED', 'publico', 'Pr. José Ricardo Alves', '2024-07-22', ARRAY['novo nascimento', 'Nicodemos', 'João 3:16', 'Espírito']::text[], '2024-07-22T09:00:00.000Z', '2024-07-22T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('cd86a362-95aa-45b2-b501-3c7969c43f2f', 'ef4c95c3-418b-4868-9cb9-0e07b2c481be', 3, 1, 21, 'João 3:1-21');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('3d5e7626-846a-468c-b780-af52dcb8b96d', 'cd86a362-95aa-45b2-b501-3c7969c43f2f', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('3d5e7626-846a-468c-b780-af52dcb8b96d', '2f299c9f-448a-41a8-ae03-0a9f2c5eed7c', 2);
insert into public.study_topics (study_id, topic_id, peso) values ('3d5e7626-846a-468c-b780-af52dcb8b96d', '6669416d-5b53-447a-938e-ac5f0c93a8c1', 3);
insert into public.study_characters (study_id, character_id, papel) values ('3d5e7626-846a-468c-b780-af52dcb8b96d', '5fb84dee-477b-4642-8fa0-140508aa00f5', 'protagonista');

-- Pedro restaurado à beira-mar [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('dddf3599-7d6d-4e12-8284-3fbdec43a3be', 'Pedro restaurado à beira-mar', 'pedro-restaurado-a-beira-mar', 'Após negar Jesus três vezes, Pedro é restaurado à beira do mar da Galileia em João 21, com um chamado renovado a cuidar do rebanho.', 'Depois da ressurreição, Jesus prepara um café da manhã na praia para os discípulos que voltaram a pescar, sem sucesso, durante a noite.

Três vezes Jesus pergunta a Pedro se ele o ama, espelhando as três negações — não para humilhar, mas para restaurar publicamente o que havia sido quebrado.

A cada resposta de Pedro, Jesus responde com uma missão: ''apascenta os meus cordeiros'', ''pastoreia as minhas ovelhas'' — transformando o fracasso em vocação renovada.', 'PUBLISHED', 'publico', 'Profa. Marta Nascimento', '2024-08-03', ARRAY['restauração', 'negação', 'pastoreio', 'mar da Galileia']::text[], '2024-08-03T09:00:00.000Z', '2024-08-03T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('2122cbd4-3a74-4c6f-b133-853c2071e105', 'ef4c95c3-418b-4868-9cb9-0e07b2c481be', 21, 15, 19, 'João 21:15-19');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('dddf3599-7d6d-4e12-8284-3fbdec43a3be', '2122cbd4-3a74-4c6f-b133-853c2071e105', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('dddf3599-7d6d-4e12-8284-3fbdec43a3be', '5a82d3bb-82db-4850-b8ff-c22e933bf78d', 2);
insert into public.study_topics (study_id, topic_id, peso) values ('dddf3599-7d6d-4e12-8284-3fbdec43a3be', '6ae24085-6eb2-4526-a870-b64d5a3643e5', 2);
insert into public.study_characters (study_id, character_id, papel) values ('dddf3599-7d6d-4e12-8284-3fbdec43a3be', 'f74337de-f829-4745-9a04-c9510f19b53c', 'protagonista');
insert into public.study_characters (study_id, character_id, papel) values ('dddf3599-7d6d-4e12-8284-3fbdec43a3be', '5fb84dee-477b-4642-8fa0-140508aa00f5', 'mencionado');

-- Nenhuma condenação: Romanos 8 [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('f8e6dfd7-a6c9-4a9c-8359-9b8640db0577', 'Nenhuma condenação: Romanos 8', 'nenhuma-condenacao-romanos-8', 'Romanos 8 declara que não há condenação para os que estão em Cristo Jesus, e que nada pode separar o crente do amor de Deus.', 'Paulo abre o capítulo com uma das afirmações mais libertadoras do Novo Testamento: ''não há, pois, agora, nenhuma condenação para os que estão em Cristo Jesus'' (8:1).

O capítulo descreve a obra do Espírito que habita no crente, intercede nos momentos de fraqueza e garante a adoção como filhos de Deus.

O texto culmina em uma lista retórica de possíveis separações — tribulação, angústia, perseguição — todas respondidas pela certeza de que nada ''nos poderá separar do amor de Deus'' (8:38-39).', 'PUBLISHED', 'publico', 'Equipe Editorial', '2024-08-15', ARRAY['condenação', 'Espírito Santo', 'adoção', 'amor de Deus']::text[], '2024-08-15T09:00:00.000Z', '2024-08-15T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('26bfa714-cea5-4b91-a461-28c02aaa6650', '018365c6-59c8-4327-91ef-806c483c567c', 8, 28, 39, 'Romanos 8:28-39');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('f8e6dfd7-a6c9-4a9c-8359-9b8640db0577', '26bfa714-cea5-4b91-a461-28c02aaa6650', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('f8e6dfd7-a6c9-4a9c-8359-9b8640db0577', '62894a42-b383-46da-a7d1-26fb45286768', 3);
insert into public.study_topics (study_id, topic_id, peso) values ('f8e6dfd7-a6c9-4a9c-8359-9b8640db0577', '6669416d-5b53-447a-938e-ac5f0c93a8c1', 2);
insert into public.study_characters (study_id, character_id, papel) values ('f8e6dfd7-a6c9-4a9c-8359-9b8640db0577', '15dfbb6a-e2b3-4d6b-913c-182854a17f5d', 'autor');

-- A armadura de Deus [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('8cedfb0e-8f92-4c08-9255-bc82085f7319', 'A armadura de Deus', 'a-armadura-de-deus', 'Em Efésios 6, Paulo descreve a armadura espiritual necessária para resistir nos dias maus.', 'Paulo encerra a carta aos Efésios convocando os crentes a se revestirem da armadura de Deus para resistir ''às astutas ciladas do diabo'' (6:11).

Cada peça da armadura — verdade, justiça, evangelho da paz, fé, salvação e a palavra de Deus — corresponde a uma virtude cultivada, não a um objeto mágico.

A oração constante, mencionada por último, é o que sustenta o uso de toda a armadura: a luta espiritual é vivida em dependência, não em autossuficiência.', 'PUBLISHED', 'publico', 'Pr. José Ricardo Alves', '2024-08-29', ARRAY['armadura', 'luta espiritual', 'oração', 'resistir']::text[], '2024-08-29T09:00:00.000Z', '2024-08-29T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('2fc469e3-ab6e-4883-b76c-c023112f3439', '4494fcd5-15ad-4a52-a207-bc998754b441', 6, 10, 18, 'Efésios 6:10-18');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('8cedfb0e-8f92-4c08-9255-bc82085f7319', '2fc469e3-ab6e-4883-b76c-c023112f3439', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('8cedfb0e-8f92-4c08-9255-bc82085f7319', '2f299c9f-448a-41a8-ae03-0a9f2c5eed7c', 2);
insert into public.study_topics (study_id, topic_id, peso) values ('8cedfb0e-8f92-4c08-9255-bc82085f7319', '31aa3322-a54d-4cbf-bc54-205af035e775', 2);
insert into public.study_characters (study_id, character_id, papel) values ('8cedfb0e-8f92-4c08-9255-bc82085f7319', '15dfbb6a-e2b3-4d6b-913c-182854a17f5d', 'autor');
insert into public.study_series (study_id, series_id, ordem) values ('8cedfb0e-8f92-4c08-9255-bc82085f7319', '52f8e1b5-fa45-4aa6-ad6c-3a68f8f97103', 1);

-- Fé que se prova nas provações [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('3f60387d-498b-40a7-b6e7-4ac8b7fd6eb3', 'Fé que se prova nas provações', 'fe-que-se-prova-nas-provacoes', 'Tiago 1 ensina que as provações produzem perseverança quando a fé é colocada à prova.', 'Tiago instrui seus leitores a considerar ''tudo alegria'' quando passam por diversas provações, pois a prova da fé produz perseverança (1:2-3).

A perseverança, por sua vez, deve ter obra completa, para que os crentes cheguem a ser perfeitos e íntegros, sem nada faltar.

O capítulo também conecta sabedoria e provação: quem enfrenta dificuldades e precisa de sabedoria deve pedi-la a Deus, que dá ''liberalmente e sem repreender''.', 'PUBLISHED', 'publico', 'Profa. Marta Nascimento', '2024-09-09', ARRAY['provações', 'perseverança', 'sabedoria', 'prova da fé']::text[], '2024-09-09T09:00:00.000Z', '2024-09-09T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('ebf79bd4-9840-4374-852f-0bd173ff1749', '3b2eed83-8a56-4c3a-8832-a7049e70026b', 1, 2, 12, 'Tiago 1:2-12');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('3f60387d-498b-40a7-b6e7-4ac8b7fd6eb3', 'ebf79bd4-9840-4374-852f-0bd173ff1749', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('3f60387d-498b-40a7-b6e7-4ac8b7fd6eb3', '14abff9f-1290-4167-865f-47cfab0a5e8b', 3);
insert into public.study_topics (study_id, topic_id, peso) values ('3f60387d-498b-40a7-b6e7-4ac8b7fd6eb3', '2f299c9f-448a-41a8-ae03-0a9f2c5eed7c', 2);
insert into public.study_characters (study_id, character_id, papel) values ('3f60387d-498b-40a7-b6e7-4ac8b7fd6eb3', 'e0620473-8d58-4118-a8a3-b55bf26643c2', 'autor');

-- Um novo céu e uma nova terra [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('8267e325-d41c-47ca-bb2a-cf7127d20dd7', 'Um novo céu e uma nova terra', 'um-novo-ceu-e-uma-nova-terra', 'Apocalipse 21 descreve a promessa final de restauração: um novo céu, uma nova terra e Deus habitando com o seu povo.', 'A visão de João em Apocalipse 21 descreve a passagem do primeiro céu e da primeira terra para uma nova criação, onde ''não haverá mais morte, nem pranto, nem clamor, nem dor''.

O centro da promessa não é apenas a ausência de sofrimento, mas a presença: ''eis que o tabernáculo de Deus está com os homens'' (21:3).

Este texto encerra a narrativa bíblica retomando temas do Éden — comunhão plena entre Deus e seu povo — agora numa cidade santa que desce do céu.', 'PUBLISHED', 'publico', 'Equipe Editorial', '2024-09-21', ARRAY['nova criação', 'restauração', 'esperança escatológica', 'cidade santa']::text[], '2024-09-21T09:00:00.000Z', '2024-09-21T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('066136ca-5c90-4f2a-bd2c-2d0af65f840a', '94e671ad-d695-4afe-bf76-6b7a43c397b8', 21, 1, 8, 'Apocalipse 21:1-8');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('8267e325-d41c-47ca-bb2a-cf7127d20dd7', '066136ca-5c90-4f2a-bd2c-2d0af65f840a', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('8267e325-d41c-47ca-bb2a-cf7127d20dd7', 'ad775482-7dcb-4482-9608-c630f9743ba7', 3);
insert into public.study_topics (study_id, topic_id, peso) values ('8267e325-d41c-47ca-bb2a-cf7127d20dd7', '62894a42-b383-46da-a7d1-26fb45286768', 2);
insert into public.study_characters (study_id, character_id, papel) values ('8267e325-d41c-47ca-bb2a-cf7127d20dd7', 'c0e4c93f-dafc-46a0-a448-e8653bb445e1', 'autor');

-- Fé que atravessa as Escrituras: de Abraão a Paulo [PUBLISHED]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('8bab02b9-3856-4281-8a58-cc3a4f021d5a', 'Fé que atravessa as Escrituras: de Abraão a Paulo', 'fe-que-atravessa-as-escrituras-de-abraao-a-paulo', 'Como a fé de Abraão, imputada como justiça em Gênesis, ecoa em Habacuque e é retomada por Paulo em Romanos — com um aceno ao chamado à fé em João 3.', 'Em Gênesis 15, diante da promessa de uma descendência tão numerosa quanto as estrelas, Abrão simplesmente ''creu no Senhor, e o Senhor imputou isto à sua justiça'' (15:6). A fé, não o mérito, é o que o coloca em posição correta diante de Deus.

Séculos depois, o profeta Habacuque recebe uma resposta semelhante em meio à angústia por não ver o juízo de Deus se cumprir: ''o justo viverá pela sua fé'' (Hc 2:4) — uma frase curta que se torna eixo de toda uma teologia.

Paulo recupera exatamente esses dois textos em Romanos 4 para argumentar que a justificação sempre foi pela fé, não pela lei ou pelas obras — Abraão creu antes mesmo da circuncisão, tornando-se pai de todos os que creem, circuncisos ou não.

O mesmo convite ecoa em João 3, no diálogo de Jesus com Nicodemos: o novo nascimento também é recebido pela fé, não conquistado por mérito religioso — o mesmo fio que atravessa Gênesis, Habacuque e Romanos chega ao evangelho.', 'PUBLISHED', 'publico', 'Profa. Marta Nascimento', '2024-10-15', ARRAY['fé', 'justificação', 'Abraão', 'justo viverá pela fé']::text[], '2024-10-15T09:00:00.000Z', '2024-10-15T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('a4275a25-2d98-4b48-892f-af16dc124009', '018365c6-59c8-4327-91ef-806c483c567c', 4, 1, 12, 'Romanos 4:1-12');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('8bab02b9-3856-4281-8a58-cc3a4f021d5a', 'a4275a25-2d98-4b48-892f-af16dc124009', 'MAIN', 1);
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('1d21385d-a5b9-4aba-b1b3-9b139655f33a', '3c07f1d3-363f-47af-9b75-6f8fc46c6c41', 15, 1, 6, 'Gênesis 15:1-6');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('8bab02b9-3856-4281-8a58-cc3a4f021d5a', '1d21385d-a5b9-4aba-b1b3-9b139655f33a', 'SECONDARY', 2);
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('d48847f1-01f0-4f78-bcc7-b63e28f7b370', '37431e46-b498-4301-b664-2ef6ef1f715b', 2, 2, 4, 'Habacuque 2:2-4');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('8bab02b9-3856-4281-8a58-cc3a4f021d5a', 'd48847f1-01f0-4f78-bcc7-b63e28f7b370', 'CITED', 3);
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('ae7f8c45-d26c-4883-8e07-5381662991f0', 'ef4c95c3-418b-4868-9cb9-0e07b2c481be', 3, null, null, 'João 3');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('8bab02b9-3856-4281-8a58-cc3a4f021d5a', 'ae7f8c45-d26c-4883-8e07-5381662991f0', 'CITED', 4);
insert into public.study_topics (study_id, topic_id, peso) values ('8bab02b9-3856-4281-8a58-cc3a4f021d5a', '2f299c9f-448a-41a8-ae03-0a9f2c5eed7c', 3);
insert into public.study_topics (study_id, topic_id, peso) values ('8bab02b9-3856-4281-8a58-cc3a4f021d5a', '6669416d-5b53-447a-938e-ac5f0c93a8c1', 2);
insert into public.study_characters (study_id, character_id, papel) values ('8bab02b9-3856-4281-8a58-cc3a4f021d5a', '468eb7bd-6225-4a46-83e5-c07aae67d073', 'citado');
insert into public.study_characters (study_id, character_id, papel) values ('8bab02b9-3856-4281-8a58-cc3a4f021d5a', '15dfbb6a-e2b3-4d6b-913c-182854a17f5d', 'autor');
insert into public.study_series (study_id, series_id, ordem) values ('8bab02b9-3856-4281-8a58-cc3a4f021d5a', '4963ada3-d1b8-456d-b824-2e361b4d6b78', 1);
insert into public.study_series (study_id, series_id, ordem) values ('8bab02b9-3856-4281-8a58-cc3a4f021d5a', '52f8e1b5-fa45-4aa6-ad6c-3a68f8f97103', 2);

-- O altar de Araúna: arrependimento em meio à disciplina [REVIEW]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('e80ab0b8-f00b-410c-acab-7c4d21397bca', 'O altar de Araúna: arrependimento em meio à disciplina', 'o-altar-de-arauna-arrependimento-em-meio-a-disciplina', 'Rascunho em revisão editorial sobre 2 Samuel 24 — o censo de Davi, o juízo que se segue e o altar erguido em arrependimento. Não publicado; não deve aparecer na busca pública.', 'Este é um estudo em fase de revisão editorial (status REVIEW), usado para validar que estudos nesse estado — assim como DRAFT — não aparecem na navegação nem na busca pública antes da aprovação final.

Conteúdo ainda em revisão teológica antes da publicação.', 'REVIEW', 'publico', 'Equipe Editorial', '2024-10-08', ARRAY['arrependimento', 'censo', 'altar', 'disciplina']::text[], '2024-10-08T09:00:00.000Z', '2024-10-08T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('1f447eb8-7938-478f-b3d2-f1536646564e', '98236e50-a9fe-430b-9830-8860d6a5716f', 24, 18, 25, '2 Samuel 24:18-25');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('e80ab0b8-f00b-410c-acab-7c4d21397bca', '1f447eb8-7938-478f-b3d2-f1536646564e', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('e80ab0b8-f00b-410c-acab-7c4d21397bca', '5a82d3bb-82db-4850-b8ff-c22e933bf78d', 1);
insert into public.study_characters (study_id, character_id, papel) values ('e80ab0b8-f00b-410c-acab-7c4d21397bca', 'cef03206-8458-40eb-9e96-d9e80093628d', 'protagonista');

-- A mulher virtuosa: rascunho em revisão [DRAFT]
insert into public.studies (id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data_origem, palavras_chave, created_at, updated_at) values ('9e8e6047-a1bf-4f15-907c-158341c95b7f', 'A mulher virtuosa: rascunho em revisão', 'a-mulher-virtuosa-rascunho-em-revisao', 'Rascunho ainda em revisão editorial sobre Provérbios 31 — não publicado; não deve aparecer na busca pública.', 'Este é um estudo em fase de rascunho (status DRAFT), usado para validar que estudos não publicados não aparecem na navegação nem na busca pública, conforme docs/DATA_MODEL.md e docs/INGESTION_SPEC.md (revisão humana obrigatória antes da publicação).

Conteúdo final pendente de revisão editorial.', 'DRAFT', 'publico', 'Equipe Editorial', '2024-10-01', ARRAY['mulher virtuosa', 'rascunho']::text[], '2024-10-01T09:00:00.000Z', '2024-10-01T09:00:00.000Z');
insert into public.passages (id, book_id, capitulo, versiculo_inicio, versiculo_fim, referencia_normalizada) values ('b24c1c7b-9fef-4e51-928b-7a469d310e24', 'dc0b3fbd-8420-412f-a36c-41a507b85375', 31, 10, 31, 'Provérbios 31:10-31');
insert into public.study_passages (study_id, passage_id, tipo_relacao, prioridade) values ('9e8e6047-a1bf-4f15-907c-158341c95b7f', 'b24c1c7b-9fef-4e51-928b-7a469d310e24', 'MAIN', 1);
insert into public.study_topics (study_id, topic_id, peso) values ('9e8e6047-a1bf-4f15-907c-158341c95b7f', 'f63af7ee-d213-408f-b802-ef540826bbcc', 1);

commit;
