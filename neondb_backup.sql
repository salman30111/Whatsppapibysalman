--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (84ade85)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bot_rules; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.bot_rules (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    trigger_type text DEFAULT 'exact'::text NOT NULL,
    triggers json DEFAULT '[]'::json NOT NULL,
    reply_type text DEFAULT 'text'::text NOT NULL,
    reply_content json DEFAULT '{}'::json NOT NULL,
    priority integer DEFAULT 1 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT bot_rules_reply_type_check CHECK ((reply_type = ANY (ARRAY['text'::text, 'template'::text, 'media'::text]))),
    CONSTRAINT bot_rules_trigger_type_check CHECK ((trigger_type = ANY (ARRAY['exact'::text, 'contains'::text, 'regex'::text, 'startswith'::text])))
);


ALTER TABLE public.bot_rules OWNER TO neondb_owner;

--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.campaigns (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'draft'::text NOT NULL,
    template_id character varying,
    contacts json DEFAULT '[]'::json,
    schedule json DEFAULT '{"type":"immediate"}'::json,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.campaigns OWNER TO neondb_owner;

--
-- Name: contacts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.contacts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    tags json DEFAULT '[]'::json,
    groups json DEFAULT '[]'::json,
    variables json DEFAULT '{}'::json,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.contacts OWNER TO neondb_owner;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.messages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying,
    contact_id character varying,
    template_id character varying,
    whatsapp_message_id text,
    status text DEFAULT 'queued'::text NOT NULL,
    error text,
    sent_at timestamp without time zone,
    delivered_at timestamp without time zone,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    source text DEFAULT 'manual'::text NOT NULL,
    CONSTRAINT messages_source_check CHECK ((source = ANY (ARRAY['campaign'::text, 'manual'::text, 'bot'::text, 'ai'::text])))
);


ALTER TABLE public.messages OWNER TO neondb_owner;

--
-- Name: replies; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.replies (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    contact_id character varying,
    message_id text,
    text text,
    media_url text,
    type text NOT NULL,
    received_at timestamp without time zone DEFAULT now(),
    campaign_id character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.replies OWNER TO neondb_owner;

--
-- Name: session; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO neondb_owner;

--
-- Name: settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    phone_number_id text,
    waba_id text,
    access_token text,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    ai_enabled boolean DEFAULT true,
    ai_model text DEFAULT 'gpt-4o-mini'::text,
    custom_model_id text,
    ai_system_prompt text DEFAULT 'You are a helpful WhatsApp assistant for our business. Provide concise, friendly, and professional responses to customer inquiries. Keep responses brief and relevant to their questions.'::text
);


ALTER TABLE public.settings OWNER TO neondb_owner;

--
-- Name: templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.templates (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    template_id text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    language text NOT NULL,
    components json DEFAULT '[]'::json,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.templates OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role text DEFAULT 'agent'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Data for Name: bot_rules; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.bot_rules (id, name, trigger_type, triggers, reply_type, reply_content, priority, active, created_by, created_at, updated_at) FROM stdin;
6d81e360-e0f3-41ec-a044-01aef6a96f32	hello	exact	["hello"]	template	{"text":"","templateId":"e99eac9c-ed73-4c49-85c6-823fe1492ee6"}	1	t	19400dc9-a03c-4ad5-b099-ae0ac80b9db4	2025-09-15 07:51:04.129231	2025-09-15 07:51:04.129231
56d6e1c4-21b4-434a-aeac-dc8d1b8e7d85	Test Welcome Bot	contains	["hello"]	text	{}	1	t	d997fe5e-e4f4-4585-97a6-ab09af4928b3	2025-09-15 08:02:49.142942	2025-09-15 08:02:49.142942
2803871b-c382-493c-b840-98ed435edd3a	My New Bot Rulehello there	contains	["hello"]	text	{"text":""}	1	t	d997fe5e-e4f4-4585-97a6-ab09af4928b3	2025-09-15 08:10:05.084184	2025-09-15 08:10:05.084184
\.


--
-- Data for Name: campaigns; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.campaigns (id, name, description, status, template_id, contacts, schedule, created_by, created_at, updated_at) FROM stdin;
b689d399-4b29-4da3-a9ca-58d33c6cc958	salman khalid		running	3ade247a-8dc8-4c25-aa91-8f0f1e3c8844	["a4fd7fa9-5fdd-4c98-b3dc-2443f5d92382"]	{"type":"immediate"}	19400dc9-a03c-4ad5-b099-ae0ac80b9db4	2025-09-15 20:11:23.831023	2025-09-15 20:11:23.831023
\.


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.contacts (id, name, phone, tags, groups, variables, created_at, updated_at) FROM stdin;
a4fd7fa9-5fdd-4c98-b3dc-2443f5d92382	salman khalid	+923314679868	[]	[]	{}	2025-09-14 22:53:02.862347	2025-09-14 22:53:02.862347
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.messages (id, campaign_id, contact_id, template_id, whatsapp_message_id, status, error, sent_at, delivered_at, read_at, created_at, source) FROM stdin;
8427cffc-ff0a-42ae-bb0b-42720d94a4fb	\N	a4fd7fa9-5fdd-4c98-b3dc-2443f5d92382	3ade247a-8dc8-4c25-aa91-8f0f1e3c8844	wamid.HBgMOTIzMzE0Njc5ODY4FQIAERgSQzNFN0M0QjNEODA3MzY2ODdBAA==	sent	\N	2025-09-14 23:02:28.86	\N	\N	2025-09-14 23:02:28.86968	manual
07a81b63-d374-48c2-be36-0cba4eda4294	\N	a4fd7fa9-5fdd-4c98-b3dc-2443f5d92382	3ade247a-8dc8-4c25-aa91-8f0f1e3c8844	wamid.HBgMOTIzMzE0Njc5ODY4FQIAERgSNjAzMDdCNDcxNzU3NUZDRTk4AA==	sent	\N	2025-09-15 06:45:36.735	\N	\N	2025-09-15 06:45:36.745549	manual
c310ce18-8a96-425a-8ece-4f42c68267bd	\N	a4fd7fa9-5fdd-4c98-b3dc-2443f5d92382	e99eac9c-ed73-4c49-85c6-823fe1492ee6	wamid.HBgMOTIzMzE0Njc5ODY4FQIAERgSNDc5NEU5RkE1QjI0MjNBOTNBAA==	sent	\N	2025-09-15 06:55:30.816	\N	\N	2025-09-15 06:55:30.82514	manual
5fb7d830-5d8d-493d-84ab-5f4fc6745527	\N	a4fd7fa9-5fdd-4c98-b3dc-2443f5d92382	3ade247a-8dc8-4c25-aa91-8f0f1e3c8844	wamid.HBgMOTIzMzE0Njc5ODY4FQIAERgSNjdGOTdFOUJBNjE5NTU3QkM0AA==	sent	\N	2025-09-15 07:18:56.802	\N	\N	2025-09-15 07:18:56.810998	manual
f59e219a-e667-42a3-b484-5a4c15b611b0	\N	a4fd7fa9-5fdd-4c98-b3dc-2443f5d92382	e99eac9c-ed73-4c49-85c6-823fe1492ee6	wamid.HBgMOTIzMzE0Njc5ODY4FQIAERgSMkUzQTc5NjI4M0E1REY3NzczAA==	sent	\N	2025-09-15 20:08:35.757	\N	\N	2025-09-15 20:08:35.76654	manual
316b7a4c-5f64-4b2b-921c-567d5f117866	\N	a4fd7fa9-5fdd-4c98-b3dc-2443f5d92382	3ade247a-8dc8-4c25-aa91-8f0f1e3c8844	wamid.HBgMOTIzMzE0Njc5ODY4FQIAERgSNjIxOTM5NDA0NDhDQjI3QThDAA==	sent	\N	2025-09-15 20:10:39.72	\N	\N	2025-09-15 20:10:39.727136	manual
\.


--
-- Data for Name: replies; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.replies (id, contact_id, message_id, text, media_url, type, received_at, campaign_id, created_at) FROM stdin;
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.session (sid, sess, expire) FROM stdin;
YmZnX9nWIRgw-TbKCQ6zjUrjDWw1RwqQ	{"cookie":{"originalMaxAge":86400000,"expires":"2025-09-16T06:55:44.381Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"4de7c871-81c9-42c8-aae6-8a9aa0431814"}}	2025-09-16 07:01:00
4JLr9AlmZxJ1uxGwS1ZonpWf8hnM7Sp7	{"cookie":{"originalMaxAge":86400000,"expires":"2025-09-15T23:32:37.968Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"db4c190f-9998-4be1-b0f1-376eb287ab9f"}}	2025-09-15 23:42:40
CzYVFLVYfz7M6CARjUb3pkAkkQclebg7	{"cookie":{"originalMaxAge":86400000,"expires":"2025-09-15T22:49:58.688Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"9e9854a7-9f95-4125-a4e7-affb18543e9b"}}	2025-09-15 22:54:04
yy__6hSizMk21UaYht7DphCLUgq5mLdD	{"cookie":{"originalMaxAge":86400000,"expires":"2025-09-16T07:52:35.573Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"d997fe5e-e4f4-4585-97a6-ab09af4928b3"}}	2025-09-16 08:10:06
XNGZlMB8V5g3lLHIQFMVo7hTUxVyL_n_	{"cookie":{"originalMaxAge":86400000,"expires":"2025-09-15T22:51:04.275Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"19400dc9-a03c-4ad5-b099-ae0ac80b9db4"}}	2025-09-16 20:12:38
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.settings (id, phone_number_id, waba_id, access_token, created_by, created_at, updated_at, ai_enabled, ai_model, custom_model_id, ai_system_prompt) FROM stdin;
f6a4a5b4-1c24-471a-aad1-25848637d435	741793202347108	1270945544672385	7db5a2d900ce34077049a499365d1335:0268ca974a59fd897eb5557130ba05411ed1e3cf16e2052e1acb86650419080ada3cd2a22e6530df4785a4aa274ea74e8fbf03da9671c1b001ec75f42e4a236b2a45f126a26e3e714bb56dcb04bedfa8461a8e06904c529402327a1396fa588567b1df085d6847a30ca4df252b11613e2e9f111f656cbf5c9bc6e559528b2816cc7bcfad22639a1f855c44aa8a98c6e664fa08382f2f77ef3653722720b509f94d1358426d1aecf65500dfb65b630f6e5ae613dfea8ed50f729fd4a1ddb72e17996bb7217f20e35d6597a0f695c3165c	19400dc9-a03c-4ad5-b099-ae0ac80b9db4	2025-09-14 22:50:35.461891	2025-09-14 22:50:35.461891	t	gpt-4o-mini	ft:gpt-4.1-2025-04-14:sss:lead-analysis:BrPK4DEV	You are a helpful WhatsApp assistant for our business. Provide concise, friendly, and professional responses to customer inquiries. Keep responses brief and relevant to their questions.
\.


--
-- Data for Name: templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.templates (id, template_id, name, category, language, components, created_at, updated_at) FROM stdin;
aeaa1e72-d3bb-4e98-800c-0f57ac1927f5	1531396781354514	rec_abdullah_message	MARKETING	en	[{"type":"HEADER","format":"VIDEO","example":{"header_handle":["https://scontent.whatsapp.net/v/t61.29466-34/10000000_1531396808021178_4457619720505512789_n.mp4?ccb=1-7&_nc_sid=8b1bef&_nc_ohc=B9dCAhDG7UcQ7kNvwHv5_14&_nc_oc=AdlKMnJf6FyFLqDUOM2aqdStj0iJk607VME9mvz9WlFShxWfrNi6yNuPyTBAHD2mc8k&_nc_zt=28&_nc_ht=scontent.whatsapp.net&edm=AH51TzQEAAAA&_nc_gid=DT8iqDs6L92ITw2D6GSKEw&oh=01_Q5Aa2gHPd8U8867AQWWuYz3GoKDPwRuEsRdc3tJlfR9mK4B3hw&oe=68EEC391"]}},{"type":"BODY","text":"Hi *{{name}}*,\\n\\nThis is *Abdullah Ayyub* from *Autograph Serviced Apartments* – DHA Phase 5, Adjacent,M Block Extension.\\n\\n*We’re offering:*\\n✅ Attractive Commission Structure\\n✅ Prime DHA Location\\n✅ 35+ World-Class Amenities\\n✅ Strong ROI & Capital Gain Potential\\n✅ RECs Referral Programs\\n\\n*If you’d like to collaborate and bring your clients this premium opportunity, let’s connect.*","example":{"body_text_named_params":[{"param_name":"name","example":"salman"}]}},{"type":"FOOTER","text":"Contact us by pressing button below."},{"type":"BUTTONS","buttons":[{"type":"PHONE_NUMBER","text":"Call Us","phone_number":"+923102297809"}]}]	2025-09-14 22:51:25.479892	2025-09-14 22:51:25.479892
3ade247a-8dc8-4c25-aa91-8f0f1e3c8844	1465482061456530	rec_message	MARKETING	en	[{"type":"HEADER","format":"VIDEO","example":{"header_handle":["https://scontent.whatsapp.net/v/t61.29466-34/534426960_1465482064789863_8952195380884307848_n.mp4?ccb=1-7&_nc_sid=8b1bef&_nc_ohc=eU4oTL-zjVUQ7kNvwGwpefN&_nc_oc=AdlrhE06jFB0xWl978RvB8YH9S2_n0Z2pmD3U05CLeffVGVjmFdp7adPzWIfL2_uFwI&_nc_zt=28&_nc_ht=scontent.whatsapp.net&edm=AH51TzQEAAAA&_nc_gid=FyDligUSB-40RkcW_-Y7bg&oh=01_Q5Aa2gH6F9OOIHzF0z7slI6oRbsg59ukC7cHBscxVV5jabOHag&oe=68EEB3C4"]}},{"type":"BODY","text":"Hi ,\\n\\nThis is *Abdullah Ayub* from *Autograph Serviced Apartments* – DHA Phase 5, M Block Extension.\\n\\nWe’re offering:\\n✅ Attractive Commission Structure\\n✅ Prime DHA Location\\n✅ 35+ World-Class Amenities\\n✅ Strong ROI & Capital Gain Potential\\n✅ RECs Referral Programs\\n*If you’d like to collaborate and bring your clients this premium opportunity, let’s connect.*"},{"type":"FOOTER","text":"Press below button to contact us."},{"type":"BUTTONS","buttons":[{"type":"PHONE_NUMBER","text":"Call Us","phone_number":"+923102297809"}]}]	2025-09-14 22:52:33.715189	2025-09-14 22:52:33.715189
e99eac9c-ed73-4c49-85c6-823fe1492ee6	1246155560034813	first_message	MARKETING	en	[{"type":"HEADER","format":"VIDEO","example":{"header_handle":["https://scontent.whatsapp.net/v/t61.29466-34/520227808_1246155563368146_3542742565759792353_n.mp4?ccb=1-7&_nc_sid=8b1bef&_nc_ohc=DLvv5xJh0twQ7kNvwFCXMZd&_nc_oc=Adl9Xq4cj0ZdTdJcSeOzbvNd2ZtGYCzz-bBgxWu7HezLOsIV-sIlhgB7JMNVqNmqWxo&_nc_zt=28&_nc_ht=scontent.whatsapp.net&edm=AH51TzQEAAAA&_nc_gid=njSHp5SO0W1GQjlfenbP-g&oh=01_Q5Aa2gEqoM35EAxtmcUEBCrqlAgX_poTYh7IwZf260HBe2qAJA&oe=68EF1052"]}},{"type":"BODY","text":"*Welcome to Autograph Serviced Apartments!*\\nThank you for connecting with us. 🏙️\\nExperience luxury living with unmatched comfort, prime location, and world-class amenities.\\n*How can we assist you today?*"},{"type":"FOOTER","text":"Please Select Options below"},{"type":"BUTTONS","buttons":[{"type":"QUICK_REPLY","text":"Autograph Brief"},{"type":"QUICK_REPLY","text":"1 BHK Premium Suite"},{"type":"QUICK_REPLY","text":"2 BHK Platinum Suite"},{"type":"QUICK_REPLY","text":"3 BHK Royal Suite"},{"type":"QUICK_REPLY","text":"4 BHK Duplex Penthouse"},{"type":"QUICK_REPLY","text":"5 BHK Sky Mansion"},{"type":"PHONE_NUMBER","text":"Call UAN","phone_number":"+923111804804"},{"type":"URL","text":"Visit website","url":"https://autograph.com.pk/"}]}]	2025-09-15 06:47:03.606756	2025-09-15 06:47:03.606756
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, name, email, password, role, created_at, updated_at) FROM stdin;
9e9854a7-9f95-4125-a4e7-affb18543e9b	salman khalid	salman467986@gmail.com	116bcc7c6df219a646ffec8e4d12881501666f59961f06aafc365b637d992a91106831809689590403b316f9522ea078d45c0102185e51c956a6af2af5452c01.7176d887fe76899b86c8f762c6f0168d	agent	2025-09-14 22:49:23.116452	2025-09-14 22:49:23.116452
19400dc9-a03c-4ad5-b099-ae0ac80b9db4	salman khalid	salman4679868@gmail.com	4484ef7205c6678071b2875609de8bcd8163dbf0f07178be034a2f4c10b9981ef90c340787f1862a37677a773606fb3a87bd6f447776c7c5414c4eb85443d9e8.3f7217519fb2e1ed76d56fe56279b80c	agent	2025-09-14 22:51:04.214131	2025-09-14 22:51:04.214131
db4c190f-9998-4be1-b0f1-376eb287ab9f	Test User	test+vWNY8N@example.com	f54a30c9e9e5c5d653f91f1e452b5e9f5845441369963954ae460143b6ceb4be271ef59219fa629caf98321a3873c1c8101864142b15ca4c1e7f3e3ec10f2c8d.c94b628a1d6c9e8f0ed4ea69d7f95e88	agent	2025-09-14 23:32:37.763502	2025-09-14 23:32:37.763502
4de7c871-81c9-42c8-aae6-8a9aa0431814	Test User	newuser@example.com	468258884c0788cc17b0e647faddebb37642b7d4b374e5ba15e7fbf2461de009d16f0b5abd76a6ab9f8da39ac350225d61b3252e434547a014b60a0ad1b07c00.15ff068df9e077181a4b6482f9c5f008	agent	2025-09-15 06:55:44.165265	2025-09-15 06:55:44.165265
d997fe5e-e4f4-4585-97a6-ab09af4928b3	salman	salman@gmail.com	d3000e5495f1ce4db04630df0417eb70d711e0d8630ee5cc1f02efc8107b7f095d2f2f5148f592168e295fbefdd63348fb598ff25c7805f00cbbba95c6c1325a.fe0a1751de3fcce5f241ba72b1d6f94a	agent	2025-09-15 07:52:35.394972	2025-09-15 07:52:35.394972
\.


--
-- Name: bot_rules bot_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bot_rules
    ADD CONSTRAINT bot_rules_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_phone_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_phone_unique UNIQUE (phone);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: replies replies_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.replies
    ADD CONSTRAINT replies_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: bot_rules bot_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bot_rules
    ADD CONSTRAINT bot_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: campaigns campaigns_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: campaigns campaigns_template_id_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_template_id_templates_id_fk FOREIGN KEY (template_id) REFERENCES public.templates(id);


--
-- Name: messages messages_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: messages messages_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: messages messages_template_id_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_template_id_templates_id_fk FOREIGN KEY (template_id) REFERENCES public.templates(id);


--
-- Name: replies replies_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.replies
    ADD CONSTRAINT replies_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: replies replies_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.replies
    ADD CONSTRAINT replies_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: settings settings_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

