# Hinglish house style

**Status: proposal, with the owner's decisions of 12 October 2026 applied** (O1–O5, O8, O9;
see §9). Still open: O7, which waits on the phone check in §8.7, and O11–O12, which are
prompt 109's to raise. Nothing in the app uses this yet. Prompt 109 is the first work that
will.

The owner decided on 12 October 2026 that v1 offers Hinglish. The app labels it
**"Hinglish (Hindi in Latin script)"**, and its language tag is `hi-Latn`. Phones don't offer
Hinglish as a system language, so people choose it by hand in the app's Language setting.
Hinglish has no fixed spelling ("kya" or "kyaa", "hai" or "he"). This document sets one house
style and one fixed spelling list, and everything we write in Hinglish keeps to them.

The owner is a native Hindi speaker and is the final judge of every line here. The writer of
this draft is not a native speaker. Every Hinglish sentence below is a draft for the owner to
correct, not a finished translation.

**Contents**

1. [How this was put together](#1-how-this-was-put-together)
2. [Research and sources](#2-research-and-sources)
3. [House style, part one: code-switching](#3-house-style-part-one-code-switching)
4. [House style, part two: transliteration](#4-house-style-part-two-transliteration)
5. [The rest of the style](#5-the-rest-of-the-style)
6. [The fixed spelling list](#6-the-fixed-spelling-list)
7. [Real sentences from the app, in this style](#7-real-sentences-from-the-app-in-this-style)
8. [Language tag and screen readers](#8-language-tag-and-screen-readers)
9. [The owner's decisions, and what is still open](#9-the-owners-decisions-and-what-is-still-open)

---

## 1. How this was put together

**What is sourced and what is judgement.** Each section says which it is. Three labels are
used throughout:

- **Sourced**: it rests on a published source linked in §2.
- **Observed**: it was seen directly while writing this. In practice that means the output of
  the CLDR locale data that ships inside Node.js, run in this repository's environment.
- **Judgement**: the writer's own proposal. The owner should treat these as the first things
  to check.

**How the rules were derived.** No Indian consumer app has published a Hinglish style guide
that we could find, and neither has any agency. Nothing found rules on "kya" against "kyaa",
or on "nahi" against "nahin". So the rules were worked out three ways:

- **Shipped app screens and notifications.** Above all, Google Pay India's Hinglish interface
  (2021), the only major Indian app found that offers Hinglish as a selectable language. Also
  the Hinglish notifications and campaign lines of Swiggy, Zomato, Blinkit, Paytm, PhonePe and
  Meesho, as reported in the press.
- **Published conventions next door to this problem.** These are Hindi localisation style
  guides on aap and tum, Netflix's Romanized Hindi subtitle rules, the formal romanisation
  standards, and the `hi-Latn` locale data in Unicode CLDR.
- **Research on how people actually write romanised Hindi.** This is the code-mixing and
  spelling-variation literature.

Where those disagree, or say nothing, the rule is judgement and is marked as such.

**Short quotations only.** The examples quoted from other apps are a few words each. They
show spelling and register, and none of their wording is reused in our copy.

**A limit on the research, stated plainly.** This environment's network policy blocked
almost every source website, including w3.org, unicode.org, iana.org, wikipedia.org,
support.apple.com, the news sites and the speech vendors' documentation. GitHub was
reachable. So every source here carries one of three levels of checking:

1. **Observed.** Seen directly while writing: the CLDR output in §2.4 and §8.2.
2. **Read in an official copy.** The text was read in the publisher's own copy hosted on
   GitHub. This covers:
   - the W3C articles, the CLDR specification and data, and the IANA registry copy
   - the Android (AOSP), TalkBack, Chromium, WebKit, React Native, Expo and Hermes sources and
     documentation
   - the Amazon Polly and Azure documentation sources
   - Zulip's Hindi guide
   - Apple's and Android's developer pages, which were reachable

   These are as good as the website.
3. **Found by search; page not opened.** The rest, which is all the press coverage of Indian
   apps in §2.1–§2.2. Each quotation comes from search results, which summarise pages, so it
   may be slightly paraphrased.

Before this document is used as evidence outside the team, someone with open network access
should open the level-3 links and check the quotation.

**Where the app's text came from.** When this was first written, the English text of
prompts 101–103 had not merged and none of their branches was open. So the sentences in §7
are taken from `main` at commit `5cf2c42`: `src/app.js`, `src/model.js`, `apps/mobile`, and
`server/mailer.js` for the emails. No unmerged branch was used.

Since then, #418 has merged the translation system's foundation. Its `locales/en.json` holds
the first 132 strings. Two of the sentences in §7 are among them and are marked with their
keys. The rest still live only in the source files, and their line numbers may have moved.

**The app sends no push notifications today.** `apps/mobile` has no notifications
dependency. "Notifications" in this document therefore means the two things the app does
send: emails, and the short status lines and toasts shown on screen.

---

## 2. Research and sources

Each link says how it was checked (§1). In §2.1–§2.2, everything was found by search and the
page was not opened.

### 2.1 How Indian apps write Hinglish on their screens

**Google Pay India, Hinglish as an app language (November 2021).** This is the strongest
evidence there is. In November 2021 Google launched Hinglish as a language you choose inside
Google Pay. Coverage quotes Google calling it an industry first.

- **What it looks like.** Roman script, Hindi grammar, everyday English nouns left in English.
  Strings quoted in the coverage:
  - "Apna bank account add karein"
  - "Contacts ko pay karein"
  - "QR Code scan karein"
  - "Bill Bharein"
- **Polite form.** Every reported imperative uses the polite *-ein* form tied to *aap*.
  None uses *-o*.
- **English kept for:** bank account, add, pay, scan, QR Code, contacts, bill.
- **Hindi for:** the grammar, plus one verb with a common Hindi equivalent (bharna, "to pay a
  bill").
- **Sources** (found by search; pages not opened):
  - Business Today, 18 Nov 2021: <https://www.businesstoday.in/amp/technology/news/story/google-pay-to-be-available-in-hinglish-soon-you-can-also-split-bills-on-it-312636-2021-11-18>
  - TechCrunch, 17 Nov 2021: <https://techcrunch.com/2021/11/17/google-pay-to-add-hinglish-support-in-india-enable-merchants-to-create-digital-storefronts/>
  - OfficeChai, the source of the scan, pay and bill strings: <https://officechai.com/stories/google-pay-introduces-new-hinglish-language-option-in-its-app/>
  - Inc42, which says it is chosen in the app's language settings: <https://inc42.com/?p=292927>
  - Google's own India blog, 2021: <https://blog.google/intl/en-in/company-news/outreach-initiatives/google-india-2021-stepping-product-focus-drive-digital-inclusion-india/>

**Blinkit, a Hinglish push notification (July 2024).** A Bengaluru customer objected
publicly to a notification reading "Dekho ye order 12 minutes mein deliver ho bhi gaya".

- **What it shows:**
  - "ye", not "yeh"
  - "mein"
  - a casual *tum* imperative ("dekho")
  - English kept for order, minutes and deliver
- **Sources** (found by search; pages not opened):
  - <https://newsable.asianetnews.com/karnataka-news/bengaluru-man-threatens-blinkit-app-of-fir-for-hindi-notification-netizens-roast-him-to-write-in-kannada-first-vkp-sgps88>
  - <https://newskarnataka.com/trending/kannada-speaking-man-condemns-delivery-app-for-hindi-notifications/16072024/>

  The press coverage disagrees about how the exchange went.
- **Why it matters here:** a Hinglish line written by a Bangalore team was criticised *in
  Bangalore* for not being Kannada. See open choice O9.

**Campaign lines (advertising, not app screens).** These show register only:

- Paytm: "Paytm Karo"
- PhonePe: "Karte Ja. Badhte Ja."
- Swiggy: "Swiggy Karo, Phir Jo Chahe Karo"
- Zomato: "Mithai Zomato Karo"
- Meesho: "Aise Kaise?"

Advertising uses *tum* and even *tu* ("ja"). Google Pay's screens use *aap* ("karein"). The
house style follows the screens, not the ads. Sources (found by search; pages not opened):

- <https://www.phonepe.com/press/phonepe-launches-karte-ja-badhte-ja-with-aamir-khan-and-alia-bhatt/>
- <https://www.exchange4media.com/advertising-news/swiggy-unveils-new-tvcs-targeted-at-modern-indian-families-93106.html>
- <https://www.freepressjournal.in/amp/viral/zomatos-viral-diwali-ad-has-an-outer-space-connection-brand-tags-nasa-while-releasing-video-online>
- <https://www.exchange4media.com/advertising-news/meeshos-festive-sale-campaign-has-tamannaah-bhatia-kapil-sharma-wondering-aise-kaise-137041.html>
- <https://socialsamosa.com/2021/04/paytm-india-topical-marketing-strategy>

**Other apps chose regional languages, not Hinglish.**

- Zomato and Flipkart launched Hindi and regional-language interfaces.
- PhonePe lists eleven app languages, none of them Hinglish.
- No Hinglish interface option was found for Flipkart, Paytm, PhonePe or Swiggy.

So in-app Hinglish *as a chosen language* has one well-known precedent, Google Pay.
Sources (found by search; pages not opened):

- <https://www.indiaretailing.com/?p=167163>
- <https://yourstory.com/2019/09/flipkart-hindi-platform-bharat-india-ecommerce>
- <https://www.phonepe.com/hi/index.html>

### 2.2 What reads as flippant: notifications that went wrong

Indian food and grocery apps are known for cheeky, flirty push copy. Some of it has gone
badly wrong in public:

- **Zepto, October 2024.** A "miss you"-style notification about an emergency contraceptive
  went to a woman who had never ordered it. Zepto apologised.
  - <https://www.wionews.com/india-news/woman-receives-zepto-notification-miss-you-says-i-pill-sparks-outcry-on-internet-767709>
  - <https://www.deccanherald.com/amp/story/business%2Fcompanies%2Fmiss-you-says-i-pill-zepto-faces-backlash-over-insensitive-notification-issues-apology-3232640>
- **Zepto, June 2024.** Flirty notifications to a comedian, sent repeatedly, drew a public
  request to stop.
  - <https://www.storyboard18.com/brand-marketing/tired-of-persistent-zepto-notifications-vir-das-asks-quick-commerce-brand-to-stop-34683.htm>
- **Zomato, November 2022.** Press coverage describes the humorous, pun-based notifications
  that Zomato started and others copied.
  - <https://www.socialsamosa.com/2022/11/new-age-brands-redefined-age-old-push-notifications>
- **User forums.** Users call this style "cringe", and say they prefer plain notifications.
  - <https://www.grapevine.in/post/swiggy-vs-zomato-notifications-9b4d897c-3c9f-42ed-8720-e1dadf9cec33>
- **Indian consumer regulation.** The Central Consumer Protection Authority's Dark Patterns
  Guidelines (30 November 2023) name "confirm shaming": wording that uses fear, shame,
  ridicule or guilt to push a purchase.
  - <https://www.scconline.com/blog/post/2023/12/04/ccpa-notifies-guidelines-for-prevention-and-regulation-of-dark-patterns-2023-legal-news/>

No source was found about cheeky copy around payments specifically. The rule against
flippancy near money and privacy (§5.7) is judgement. It is supported by the cases above and
by this product's own principles (`docs/PRODUCT_PRINCIPLES.md`: never shame spending, never
use alarmist language).

### 2.3 aap and tum in published Hindi localisation guides

- **Zulip's Hindi translation guide.** The current guide says "Use _आप_ as the second-person
  pronoun. Don't use तुम or तू." (read in the official copy on GitHub). Older versions said
  the opposite and pointed to Google as the example (found by search).
  - <https://zulip.readthedocs.io/en/9.2/translating/hindi.html>
  - <https://github.com/zulip/zulip/blob/5.0/docs/translating/hindi.md>
- **Gengo's Hindi style guide.** Says *tum* "is not preferred": use *aap*, informal but
  polite (found by search; page not opened).
  - <https://gengo.com/hi/translators/resources/style-guide/>
- **Microsoft's Hindi style guide (PDF).** It exists. Whether it covers Latin script or this
  choice could not be confirmed (found by search; page not opened).
  - <https://download.microsoft.com/download/2/b/5/2b543b85-0ed4-49a7-8b3a-98ffa7addcfb/hin-ind-StyleGuide.pdf>

These are Devanagari guides, not Hinglish guides. They agree with what Google Pay ships
(§2.1) and with the owner's decision for Hindi: *aap* by default.

### 2.4 Spelling: standards, research, and the one machine-readable source

Except where marked, the links in this section were found by search and not opened.

**Formal standards use diacritics, which no app uses.** Hunterian, India's official
romanisation, writes long vowels with a macron (ā, ī). So do ISO 15919 and the Library of
Congress table. Consumer Hinglish never uses diacritics. These standards settle which Hindi
sound is which, but not how Hinglish spells it.

- <https://en.wikipedia.org/wiki/Hunterian_transliteration>
- <https://loc.gov/catdir/cpso/romanization/hindi-2026.pdf>

**Informal romanisation varies a lot.**

- Google's Dakshina dataset (Roark et al., 2020) records about 1.8 attested romanisations for
  each Hindi word: <https://arxiv.org/pdf/2007.01176>
- Bali et al. (2014), "I am borrowing ya mixing?", shows English words in Hindi sit on a
  continuum from borrowed to switched, and that non-standard spelling is the norm:
  <https://aclanthology.org/W14-3914>
- Karamali's University of Washington work finds writers often use one letter for both short
  and long vowels. It also finds they are more consistent than they look:
  - <https://depts.washington.edu/sociolab/publications/documents/2-9-roman-hindi-urdu.pdf>
  - <https://digital.lib.washington.edu/researchworks/items/988a7873-f27c-472a-a153-da0953ee301e>

**Netflix's Hindi timed-text guide** has a Romanized Hindi section. Its example spellings use
"ee" for long ī and "kh": "Tareekh", "Akhbar", "Shukriya".

- <https://partnerhelp.netflixstudios.com/hc/en-us/articles/115003196707-Hindi-Timed-Text-Style-Guide>

**Amazon's guide for Hindi Alexa skills** says to write Hindi in Devanagari and English words
in Latin, mixing scripts. That is a different convention from ours, and it is noted here only
so nobody mistakes it for a `hi-Latn` precedent.

- <https://developer.amazon.com/en-IN/docs/alexa/custom-skills/use-hindi-in-your-alexa-skill.html>

**Unicode CLDR has real `hi-Latn` locale data (observed).** Node.js 22.22.0 in this
repository ships ICU 77.1 with CLDR 47. Asked to format in `hi-Latn`, it produced the
following:

| Asked for | CLDR `hi-Latn` output |
|---|---|
| days, relative | "kal / aaj / aane wala kal", "3 din pahle", "3 din mein" |
| weeks | "pichhla hafta / is hafte / agla hafta", "3 hafte pahle" |
| months | "pichhla maheena / yah maheena / agla maheena", "3 maheene mein" |
| years | "pichhla saal / is saal / agla saal" |
| hours | "1 ghante pahle", "1 ghanta", "7 ghante" |
| weekdays | "Raviwaar, Somwaar, Mangalwaar, Budhwaar, Guruwaar, Shukrawaar, Shaniwaar" |
| month names | English: "January … December" |
| full date | "Somwaar, 12 October 2026" |
| long date | "12 October, 2026" |
| time | "7:35 PM" |
| "and" list | "Asha, Ravi, aur Meera" |
| "or" list | "a, b yaa c" |
| number | "12,34,567.5" (Indian grouping) |
| language name | `hi-Latn` is "Hindi (Latin)"; `en-IN` is "English (Bharat)" |

Several house rules below were checked against this output and agree with it:

- **Long vowels doubled inside a word:** "Somwaar", "Raviwaar".
- **The aspirated chh:** "pichhla".
- **The nasal e:** "mein".
- **English month names.**

Two of the everyday exceptions the owner chose (§4, T9) differ from CLDR on purpose. CLDR
writes "pahle" and "maheena", and we write "pehle" and "mahina". §5.4 says why that doesn't
reach the screen, and what the app does wherever CLDR and our list disagree.

### 2.5 Sources tried and not found

- No published Hinglish style guide from any company or agency.
- No study counting which of "nahi"/"nahin", or "kya"/"kyaa", is more common.
- No verbatim Zomato Hinglish push notification from a reliable source. A widely shared one
  was a fake that Zomato denied.
- Nothing from Swiggy's, PhonePe's or Zomato's engineering or design blogs on Hinglish.

---

## 3. House style, part one: code-switching

Hinglish is Hindi grammar carrying a mix of Hindi and English words. Which words stay English
is the main decision, and it is made by rule, not word by word. Each rule gives its reason.

**C1. The sentence is always Hindi.** Word order, verbs, postpositions, pronouns and
connecting words are Hindi:

- "abhi", not "now"
- "baad mein", not "later"
- "phir se", not "again"
- "aur", not "and"

*Reason:* every Hinglish sample found works this way (§2.1). A sentence built on English
grammar with Hindi words dropped in reads as a joke. *Sourced.*

**C2. Words the phone already shows in English stay English.** Settings, sign in, sign out,
account, password, email, link, app, photo, device, phone, offline, online, store, language,
theme, filter, view, screen.

*Reason:* people who choose Hinglish run their phone in English, which is why they have to
choose Hinglish in the app at all. These words match the phone around the app and the
emails they receive, so nothing is lost in a lookup. Google Pay keeps the same kind of word
in English ("bank account", "QR Code", "contacts"). *Sourced pattern; the list is judgement.*

**C3. Money words stay English.** Payment, charge, purchase, price, free, subscription,
renew, cancel, refund, store, extra.

*Reason:* precision matters most here. Indian payment apps, bank messages and app-store
receipts use these words in English. A Hindi word ("bhugtaan", "nishulk") would be the only
place the person meets it, and would read as officialese. Google Pay writes "pay karein"
(§2.1). *Sourced pattern; the list is judgement.*

**C4. The product's own named things stay English.**

- journey, moment, ledger, check-in, History, Account settings, the visibility label
  Private.
- **Together Ledger** is never translated or transliterated.

*Reason:* these name things the person can point at. They appear in emails (which stay in
English until emails are translated), in links, and on the screen of a journeyer who uses
English. A journey shared between a Hinglish reader and an English reader needs the same
nouns on both screens. *Judgement.* "journeyer" is the one exception, see C5.

The glossary that #418 added (`locales/glossary.json`) supports this for journey. It defines
a journey as "not a trip from A to B" and lists "trip" among the words to avoid. "safar" and
"yatra" both read as travel. *Decided (O3).*

**C5. The careful words become Hindi.** The words CLAUDE.md protects ("Language") carry the
product's care, and English loanwords for capacity are exactly the ones it forbids.

- In Indian English and Hinglish, capacity is "seat" and "slot". Both are banned.
- A literal English "rest" means nothing in a Hindi sentence.

So:

| English | Hinglish | Why |
|---|---|---|
| another person | ek aur insaan | "insaan" is a human being, warm and everyday. "vyakti" reads as a government form, and "person" as a count. |
| another place, room | ek aur jagah, jagah | "jagah" is a place at a table, which is the glossary's own picture of "another place" (`locales/glossary.json`). Like English "place", it can also mean a location, and the sentence decides which. |
| rests, resting | aaraam karta/karti hai, aaraam par | A pause with no blame in it. Never "hataana" or "nikaalna" (remove), "band" (shut) or "block". |
| journeyer | saathi | "journeyer" is not a word any Hinglish reader knows. "saathi" (companion) is exact, warm, and fits every kind of two-person relationship. |
| propose (a person) | sujhaav dena | In Indian English and Hinglish, "propose karna" means a romantic proposal. In a couples app that must never be the reading. |

The table is *judgement*, except the meaning of "propose": that is everyday Indian usage.
*Decided (O4):* the owner accepted all five. These are the values prompt 109 enters as the
`hi-Latn` translations in `locales/glossary.json`.

**C6. Feelings, reassurance and consequences are said in Hindi.**

- "kuch bhi nahi khoyega" (nothing will be lost)
- "ye wapas nahi liya ja sakta" (this can't be taken back)
- "sab raazi hain" (everyone agrees)

*Reason:* the warmth of the product's voice lives in the Hindi. English in these places
reads as cold system text. *Judgement.*

**C7. No officialese Hindi.** Not "kripya", "upyogkarta", "nishulk", "suvidha", "bhugtaan",
"sahayata" or "prayas". Use "madad" for help and "koshish" for try, and let the polite *-ein*
form carry the "please".

*Reason:* Sanskritised Hindi is what government forms use. Nobody in the samples writes it.
*Sourced pattern (§2.1); the list is judgement.*

**Extended by the owner (O3–O5).** Where a word reads formal, the everyday word a Bangalore
product team would use wins, even when that word is English. "order", not "kram"; "rules",
not "niyam". §6.9 lists each change.

**C8. Mixing happens between words, never inside them.**

- **English verbs.** An English verb is used as a bare stem with a Hindi helper verb: "share
  karein", "sign in karna", "verify ho gaya". It is never given English endings inside a
  Hindi sentence. Not "shared kiya", not "sharing kar rahe".
- **State words.** A small set of English state words describe a condition, and are used
  as they are: signed in, verified, offline, online, free, private. For example, "Aap ab bhi
  signed in hain".
- **English nouns keep the English plural:** "3 journeys", "journeys mein". They never take
  Hindi plural endings: not "journeyon", not "momenton".
- **Hindi nouns keep the Hindi plural:** "saathiyon", "baatein", "jagahein".

*Reason:* this is how the samples work (§2.1, "deliver ho bhi gaya"). It also keeps every
English word spelled exactly as it is in English. *Sourced pattern.*

**C9. English nouns have a fixed grammatical gender.** Hindi verbs and adjectives agree with
the noun, so every English noun needs one.

| Feminine | Masculine |
|---|---|
| journey, photo, theme, request, service, history, settings, screen, list | moment, ledger, account, payment, purchase, email, link, password, invitation, device, phone, app, check-in, view, filter, record, connection, option, access, data, Together Ledger |

So: "nayi journey", "ek naya moment", "payment nahi hua", "photo load nahi ho payi".
*Judgement.* Speakers differ on several of these, notably payment, app and email.
*Decided (O5):* the owner accepted the table as it stands.

---

## 4. House style, part two: transliteration

One mapping from Hindi to Latin letters (T1–T8). It applies to every word except a short,
fixed list of everyday words, T9, which the owner chose (O1). Where Hindi spelling
and speech differ, the mapping writes **standard Hindi spelling** (Devanagari), less the
silent vowels rule T1 removes. A writer who is unsure looks the word up in §6. A word not in
§6 is spelled by these rules and then added to §6.

**T1. The silent final vowel.** Hindi drops the inherent "a" at the end of a word, and in
the middle of many words. Wherever it is not spoken, it is not written:

- "kaam", not "kaama"
- "karna", not "karana"
- "samajhna", "badlein", "sakte"

*Sourced:* standard Hindi phonology, the ACL 2020 schwa-deletion work
(<https://aclanthology.org/2020.acl-main.696>), and every sample in §2.1.

**T2. Long and short vowels.**

| Hindi | Inside a word | At the end of a word |
|---|---|---|
| अ (short a) | a | (never written; see T1) |
| आ ā | **aa**: aap, baat, saal, khaali | **a**: kya, tha, karna |
| इ i | i: din, likhna | i |
| ई ī | **ee**: theek, zaroori, seedha | **i**: abhi, saathi, zaroori |
| उ u | u: tum, shuru | u |
| ऊ ū | **oo**: poora, zaroor, poochhna | **u**: shuru |
| ए e | e: dekhna, mere | e: ke, se, ye |
| ऐ ai | ai: kaise, taiyaar, hai | ai |
| ओ o | o: log, koshish | o: ko, wo, karo |
| औ au | au: aur, lautna, kaun | au |
| ऋ ri | ri | ri |

**Why final long vowels are written single.**

- T1 means a written final "a" can only ever be the long ā. So "kya" cannot be misread, and
  "kyaa" adds nothing.
- The same holds for final "i" and "u", since short i and u at a word's end are rare in
  everyday Hindi.

This is also how Hinglish is commonly written ("kya", "abhi", "shuru"), and how CLDR writes
it ("kya" aside, "abhi", "aaj", "kal"). *Sourced pattern; the exact rule is judgement.*

**Why long vowels are written doubled inside a word.**

- It is the one convention that tells "baat" from "bat", "baad" from "bad", "naam" from
  "nam".
- CLDR does the same ("Somwaar", "Raviwaar").
- Netflix's romanised subtitles do the same ("Tareekh").

The cost was that some everyday words looked longer than people type them: "maheena" for
"mahina", "waapas" for "wapas", "chaahte" for "chahte". The owner decided (O1) to write
those everyday words as people type them. They are the exceptions in T9. Every other word
keeps the doubled vowel.

**"End of a word"** includes a vowel followed only by a nasal (T3). That gives "kahan",
"yahan", "hon".

**T3. Nasal sounds.** A nasal vowel (chandrabindu or anusvara) is written as its vowel plus
**n**:

- hain, kahan, yahan, hon, maange, dikhenge
- **Before p, ph, b, bh, m** it is written **m**: sambhalna, ummeed.
- **A nasal e at the very end of a word** is written **ein**: mein, karein, dein, chunein,
  baatein, jagahein. A plain "en" would read as the English "-en" ("men" is an English word).
  "ein" is the established spelling, and the one CLDR uses ("3 din mein").
- **Nasal e inside a word** is plain **en**: karenge, dikhenge.

*Sourced:* the "mein" and "karein" pattern is Google Pay's and CLDR's. The rest is judgement.

**T4. Two vowels in a row.** When ए, ई or ऐ follows another vowel, a **y** is written
between them:

- gaye, gayi, nayi, naye, liye, aaye, aayegi, khoyega, hataayein

*Judgement, matching common use.*

**T5. Consonants.**

| Hindi | Latin | Examples |
|---|---|---|
| क ख ग घ | k kh g gh | kaam, khaali, galat, ghanta |
| च छ ज झ | ch **chh** j jh | chunna, chhota, pichhla, jagah, samajhna |
| ट ठ ड ढ and त थ द ध | t th d dh (retroflex and dental are not told apart) | theek, thoda, dena, padhna |
| प फ ब भ म | p ph b bh m | paas, phir, baat, bhi, maange |
| य र ल | y r l | yaad, rukna, log |
| व | **w** before a, aa, o, oo, u, au; **v** everywhere else | wo, wahan, sawaal, Somwaar, sujhaav, vishwaas |
| श ष | sh | shuru, shabd |
| स ह | s h | sab, hai |
| ण ञ ङ | n | |
| ज्ञ | gy | gyaan |
| ज़ फ़ | z f | zaroori, kaafi |
| क़ ख़ ग़ | k kh g (as without the dot) | tareeka, khaali, galti |
| ड़ ढ़ | d dh | thoda, jodna, padhna |

- **"chh" is kept apart from "ch"** because aspiration is kept for every other consonant
  (kh, gh, th, dh, ph, bh), and CLDR does the same ("pichhla"). The one everyday word where
  this looked unusual, "kuchh", is written "kuch" (T9).
- **The v/w split** follows how the sound is said. Hindi व sounds closer to w before back
  vowels and closer to v before front vowels. It matches CLDR ("Somwaar") and common use
  ("wo", "sawaal", "vishwaas").

*Mostly sourced pattern; the v/w split and the chh choice are judgement.*

**T6. Doubled consonants** are written by doubling the first letter: pakka, saccha (च्च),
chitthi (ठ्ठ). *Judgement.*

**T7. No e-colouring, except in T9.** Many people say *pehle*, *kehna*, *rehna*, where Hindi
spells पहले, कहना, रहना. The rule writes the spelling, "a".

*Reason:* writing what people say would need a rule about which "a" before "h" changes. It
would also have to reckon with "sahi" and "bahut", which nobody changes.

The everyday words where people always write the "e", pehle, kehna and rehna and their
listed forms, are exceptions in T9. Everything else keeps the "a": "raha", "rahi", "rahe",
"sahi", "bahut".

**T8. Word division.**

- One Hindi word is one Latin word.
- Postpositions stand apart: "journey mein", "aap ke liye", "us par".
- Words Hindi writes as one stay one: isliye, jismein, kyunki.
- Helper verbs stand apart: "ho gaya", "kar sakte hain".
- Repeated words take a hyphen: ek-ek, dheere-dheere.

*Judgement.*

**Words that are also English words.** The mapping produces some Hinglish words that are
English words too:

| Hinglish word | Its meaning | English word |
|---|---|---|
| main | I | main |
| use | him, her | use |
| to | then | to |
| par | on, but | par |
| baad | after | (close to bad) |
| hum | we | hum |

These are kept, because the rule is kept. Sentences are written so that the Hindi reading is
the only sensible one. Where a sentence could be misread, use another word: "ise" or "unhein"
for "use", and "Together Ledger" rather than "hum".

**T9. The everyday exceptions** (decided by the owner, O1, 12 October 2026). For the
everyday words below, the house spelling is the one people commonly type, not the one T1–T8
produce. Each exception is a whole word, and only the forms listed are exceptions. Any other
form of the same word follows T1–T8. For example, "rehna", "rehta", "rehti" are exceptions,
while "raha", "rahi", "rahe" already match what people type and follow the rules. A word
joins this list only by the owner's decision.

| Write | T1–T8 would give | Forms covered | What it departs from |
|---|---|---|---|
| nahi | nahin | nahi | the final nasal (T3) |
| kuch | kuchh | kuch | the aspirated chh (T5) |
| hum | ham | hum | short a (T2) |
| hamara | hamaara | hamara, hamari, hamare | long aa inside a word (T2) |
| haan | han | haan | final long vowel (T2) |
| pehle | pahle | pehle, pehla, pehli | no e-colouring (T7) |
| mahina | maheena | mahina, mahine | long ee inside a word (T2) |
| wapas | waapas | wapas, also in "wapas aana", "wapas lena" | long aa inside a word (T2) |
| dono | donon | dono | the final nasal (T3) |
| tumhara | tumhaara | tumhara, tumhari, tumhare | long aa inside a word (T2) |
| chahna | chaahna | chahna, chahta, chahti, chahte, chahiye | long aa inside a word (T2) |
| zyada | zyaada | zyada | long aa inside a word (T2) |
| dobara | dobaara | dobara | long aa inside a word (T2) |
| rehna | rahna | rehna, rehta, rehti, rehte | no e-colouring (T7) |
| kehna | kahna | kehna, kehta, kehti, kehte | no e-colouring (T7) |
| kyun | kyon | kyun, kyunki | the vowel o (T2) |
| batana | bataana | batana, batayein, batao | long aa inside a word (T2) |
| sambhalna | sambhaalna | sambhalna, sambhala, sambhalein, sambhalo | long aa inside a word (T2) |
| jayega | jaayega | jayega, jayegi, jayenge | long aa inside a word (T2) |
| paya | paaya | paya, payi, paye, payega, payenge | long aa inside a word (T2) |

Two of these differ from CLDR's own Hinglish ("pahle", "maheena"). The app never shows
CLDR's version of either word (§5.4).

---

## 5. The rest of the style

### 5.1 Word order

**Hindi order, verb last:** "Ye moment abhi share karein?", not "Share karein ye moment
abhi?"

- **Postpositions follow the noun**, English nouns included: "journey mein", "email par",
  "Apple se".
- **Buttons are a verb phrase ending in the verb:** "Abhi share karein", "Phir se koshish
  karein".
- **Labels that name a state are a noun phrase:** "Abhi aaraam par", "Baad mein share".

*Sourced pattern (§2.1).*

### 5.2 Politeness: aap by default, a warmer tum in a few places

**aap everywhere by default.** Imperatives take the *-ein* form: karein, chunein, dein,
rakhein, likhein. This agrees with:

- Google Pay's screens (§2.1)
- the Hindi localisation guides (§2.3)
- the owner's decision for Hindi

Always *aap* on:

- **People:** anything addressed to someone not yet in the journey (invitations, proposals),
  and every email.
- **Account:** account, sign-in, password, recovery, Account settings.
- **Money:** every word about money, rooms, resting and paying.
- **Privacy:** every word about privacy and visibility, and every consequence dialog.
- **Problems and endings:** every error, every offline message, every deletion.

**tum only on the check-in prompts and the empty states** (decided, O2). These are the
places where the app speaks like someone at your shoulder, and where *aap* reads like a form.

- the check-in prompts, such as "What is one thing you noticed and appreciated?"
- the empty states, such as "＋ Add your own" in an empty ledger

Imperatives there take the *-o* form: batao, jodo, likho. Everything else is *aap*, including
every hint in the moment editor. Most check-in prompts and empty states need no pronoun at
all (§7.10), so *tum* is rare in practice.

**Never both in one sentence, never both in one block.** A block is a card, a dialog, an
empty state, or the check-in panel. The draft said "one screen". With O2 decided, an empty
ledger shows its *tum* empty state on the same screen as the *aap* button "＋ Ek moment
sambhalein". So the line is drawn at the block instead.

**Gender of the reader.** Hindi verbs agree in gender, and we never know the reader's. *aap*
helps but does not solve it: "aap kar sakte hain" is masculine plural. So the house style
prefers forms that don't depend on the reader's gender (*judgement*):

- **Imperatives:** "chunein", "likho".
- **Past tense with "ne"**, where the verb agrees with the object: "aapne moment sambhala".
- **Passive:** "ise badla ja sakta hai".
- **Sentences whose subject is a thing, not the reader.**

A masculine-plural "sakte hain" is accepted where nothing else reads naturally. The same
applies to named people: "naye moment jodne ka option sirf Asha ke paas rahega", not
"sirf Asha jod sakegi".

### 5.3 Punctuation

- **Latin punctuation:** . , ? ! : — and the app's existing curly quotes (“ ” ’) and the
  middle dot (·). The Devanagari full stop (।) never appears in Latin text.
- **A full stop ends every sentence.** A button or label has no full stop, as in English.
- **Exclamation marks:** at most one on any screen. Never in an error, and never near money,
  privacy or deletion. In practice: almost never.
- **No emoji in interface text.** The English app has none.
- **Hyphens** only for repeated words (ek-ek) and English compounds that already have one
  (check-in).

*Judgement, aligned with the English app's existing conventions.*

### 5.4 Numbers, money, dates and times

**Decided on main by #418.** `locales/languages.json` formats Hinglish dates, numbers and
money with **`en-IN`**, Indian English, not with `hi-Latn`. Its note says why: dates and numbers
are written "as Indian English writes them, in Latin script". The rules below follow that.
The outputs quoted are observed in Node 22.22.0, ICU 77.1, CLDR 47.

**Numbers**

- Always Western digits (0–9), never Devanagari digits, and never numbers spelled out in
  words.
- **Counts:** "7 din", "12 jagahein", "2 hafte", exactly as the English app uses digits.
- **Large numbers** use Indian grouping, as `en-IN` does: "12,34,567.5".

**Money**

- Exactly as the store or Stripe gives it. Never rounded, and never re-worded into words.
- "$1/month" becomes "$1 har mahine".

**Dates**

- What `en-IN` gives: day, English month name, year. For example "12 October 2026", with no
  comma.
- Weekdays are English too ("Monday"), from the same formatter. CLDR's Hinglish weekday
  names ("Somwaar") are not used, so that a date comes from one source.
- Hindi month names (Kartik and the like) and transliterated English months ("Aktoobar") are
  never used.

**Times**

- 12-hour clock, as `en-IN` gives it: "7:35 pm".

**Relative times and lists are written by hand.** Write "3 din pehle", "5 din mein",
"Asha, Ravi aur Meera" and "a, b ya c" from §6. Don't use `Intl.RelativeTimeFormat` or
`Intl.ListFormat` for these:

- **With `en-IN`** they come out in English: "in 5 days", "Asha, Ravi and Meera".
- **With `hi-Latn`** they come out in CLDR's spellings, which differ from our list:

| CLDR `hi-Latn` writes | Our list writes | Where it comes from |
|---|---|---|
| "3 din pahle" | pehle (T9) | relative time |
| "pichhla maheena" | mahina (T9) | relative time |
| "yah maheena" | ye | relative time |
| "aane wala kal" | waala | relative time |
| "a, b yaa c" | ya | "or" list |
| "1 week", "7 months" | (left untranslated) | unit formatter |

*Observed; writing these by hand is judgement.*

**Plurals.** `locales/languages.json` says Hinglish uses Hindi's plural rules. CLDR's rule
for `hi` and `hi-Latn` puts 0 in the same category as 1 (observed: `select(0)` is "one").
Most Hindi count words don't change ("1 din", "7 din"), but some do ("1 ghanta",
"7 ghante"). Prompt 109 should test the 0 case.

### 5.5 Capitalisation

- **Sentence case**, as in the English app. Only the first word of a sentence, and proper
  nouns, take a capital.
- **Proper nouns:** Together Ledger, Apple, Google, Stripe, App Store, Google Play.
- **Screen and setting names keep the English app's capitals:** Settings, Account settings,
  History, Language.
- **No Title Case** on buttons: "Abhi share karein", not "Abhi Share Karein".
- **"aap" is never capitalised mid-sentence** for respect ("Aap" only as a sentence's first
  word).
- **English words keep their usual capitals:** "QR code", "PDF".

*Judgement, aligned with the English app.*

### 5.6 The language's own label

The Language setting shows **"Hinglish (Hindi in Latin script)"** in every interface
language, Hinglish included. The setting itself stays labelled **"Language"**.

*Reason:* someone who chose Hinglish by mistake, or handed their phone to someone, must be
able to find the way back without reading Hinglish. *Judgement.*

**Note for prompt 109.** On main, `locales/languages.json` (#418) gives Hinglish's `name` and
`nativeName` as just "Hinglish". The label the owner decided is "Hinglish (Hindi in Latin
script)". Prompt 109 should bring the two together (O12).

### 5.7 What to avoid

**Slang that dates quickly**

- bindaas, jhakaas, mast, ekdum, scene, full-on, bhai, yaar, OP
- English internet slang: lit, vibe, slay
- What sounds current in a Bangalore office this year sounds old next year, and the app has
  to read well for years.

**Anything flippant near money or privacy** (§2.2):

- **No jokes or puns** about paying, resting, deleting or sharing.
- **No minimising a price:** never "sirf $1" or "bas $1". The price is stated, never sold.
- **No guilt or urgency:** never "Abhi pay karo warna…". This is also the confirm-shaming the
  Indian dark-patterns guidelines name.
- **No tension words:** never "tension mat lo", "chill", "koi baat nahi" about a payment or
  a privacy choice. Reassurance states facts: "kuch bhi charge nahi hua", "kuch bhi nahi
  khoyega".
- **No flirty or "miss you" lines.** Ever. This is a relationship product, which makes them
  worse, not better.

**Words with a second meaning in Indian English**

- **"propose"** means a romantic proposal; use "sujhaav dena".
- **"order"** is used for a sequence: "usi order mein". In many Indian apps an "order" is a
  purchase, but this app never calls a purchase an order, so here it can only mean a
  sequence. The draft used the formal "kram"; the owner chose the everyday word (§6.9).
- **"seat", "slot"** are the capacity words this product forbids.

**Formal Hindi and officialese** (C7).

**Hindi words that seem natural but say the wrong thing**

- **"gupt"** means secret. Private is not secret.
- **"khaata"** means an account of debts (the word behind ledger apps for shop credit).
  "ledger" stays English.
- **"pal"** for moment, and **"safar" or "yatra"** for journey: see open choice O3.

---

## 6. The fixed spelling list

One spelling for each word. The left column is the only accepted spelling. The right column
lists variants seen in the wild that we do not use.

- **gender:** given for nouns (m / f).
- **rule:** names the transliteration rule (§4) that decides the spelling.
- **CLDR:** marks a spelling that matches CLDR's `hi-Latn` data (observed, §2.4).
- **T9:** marks one of the owner's everyday exceptions (§4). The strict spelling is then
  listed among the rejected variants.

### 6.1 The careful words and product words

| Write | Meaning | Not |
|---|---|---|
| Together Ledger | the product (m) | any translation or transliteration |
| journey | journey (f): "nayi journey", "aapki journey" | safar, yatra, jarni, naya journey |
| journeys | plural | journeyon, journies |
| moment | moment (m): "ek naya moment" | pal, lamha, kshan, momentt |
| moments | plural | momenton |
| ledger | ledger (m) | bahi-khaata, khaata, lejar |
| saathi | journeyer (m/f, same form) | journeyer, member, sadasya, partner, humsafar |
| saathiyon | journeyers (oblique plural) | saathiyo, sathiyon |
| invitation | invitation (m) | invite (as a noun), nyauta, nimantran |
| invite karna | to invite | invite dena, nimantrit karna |
| private | private | niji, gupt, praivet, personal |
| Private | the visibility label | Niji, Gupt |
| share karna | to share | baantna, saajha karna, shair |
| Abhi share | the visibility label "Shared now" | Abhi shared, Share kiya |
| Baad mein share | the visibility label "Share later" | Baadme share, Later share |
| aaraam | rest (m) | aram, araam, aaram |
| aaraam karna | to rest | hataana, nikaalna, block karna, band karna |
| aaraam par | resting | aaraam mein, rest par |
| ek aur insaan | another person | ek aur seat, ek aur slot, ek aur member, ek aur vyakti, ek aur person |
| insaan | person (m/f) | insan, insaaan |
| ek aur jagah | another place | ek aur seat, ek aur slot, ek aur spot, ek aur sthaan |
| jagah | place, room (f) | jaga, jageh, jaghah |
| jagahein | places | jagahen, jagahain, jaghein |
| sujhaav | proposal of a person (m) | sujhav, sujhaw, proposal |
| sujhaav dena | to propose a person | propose karna |
| lautna | to return to (a conversation) | loutna, lotna |
| sambhalna | to hold (a moment); T9 | sambhaalna, sambhal na |
| sambhalein | hold (aap); T9 | sambhaalein, sambhalen |
| check-in | check-in (m) | checkin, check in |
| History | the History screen (f) | itihaas, Itihas |
| Settings | the Settings screen (f, plural) | settingz, vinyaas |
| Language | the Language setting | Bhasha (for the setting's name) |
| Hinglish (Hindi in Latin script) | the language's label | any translation of the label |
| payment | payment (m) | bhugtaan, bhugtan, payment ho gayi |
| purchase | purchase (m) | kharid, khareedi |
| free | free | muft, nishulk, free mein |
| charge hona | to be charged | kat jaana (for money) |
| extra | extra | atirikt |

### 6.2 Pronouns and people

| Write | Meaning | Not |
|---|---|---|
| aap | you (polite) | ap, Aap (mid-sentence) |
| aapka / aapki / aapke | your | apka, apki, apke |
| aapko | to you | apko |
| aapse | from you | apse |
| aapne | you (with past tense) | apne (that is another word) |
| apna / apni / apne | one's own | apnaa |
| tum | you (warm) | tm |
| tumhara / tumhari / tumhare | your (warm); T9 | tumhaara, tumhaari, tumhaare |
| main | I | mai, mae |
| mera / meri / mere | my | meraa |
| hum | we (prefer "Together Ledger"; T8); T9 | ham |
| hamara / hamari / hamare | our; T9 | hamaara, humara |
| wo | he, she, it, that | woh, vo, voh, vah |
| ye | this, these, he, she | yeh, yah, yae |
| is / us | this, that (oblique) | iss, uss |
| ise / use | this one, that one (object) | isse, usse (those mean "from this") |
| inhein / unhein | these, them (object) | inhe, unhe, inhen, unhen |
| iska / uska / unka | its, his, her, their | iskaa, uskaa |
| koi | someone, any | koee, koyi |
| kisi | someone (oblique) | kisee |
| kuch | something; T9 | kuchh, kuchch |
| sab | all, everyone | sub |
| sabhi | all of them | sabhee |
| sabka / sabki | everyone's | sabkaa |
| har | every | harr |
| log / logon | people | logo |
| dono | both; T9 | donon, donno |
| khud | oneself | khudh |

### 6.3 Question words and connectors

| Write | Meaning | Not |
|---|---|---|
| kya | what | kyaa, kia |
| kyun | why; T9 | kyon, kyu, kiyon |
| kyunki | because; T9 | kyonki, kyuki |
| kaun | who | kon, kaon |
| kab | when | kabb |
| kahan | where | kaha, kahaan |
| kaise | how | kese, kaese |
| jab / tab | when / then | |
| jo | which, who | |
| jis / jin | which (oblique) | |
| jismein | in which | jisme, jis mein |
| jinhein | whom | jinhe, jinhen |
| jaise | as, such as | jese, jaisay |
| aise | like this | aese, ese |
| aur | and, more (CLDR) | or, aor |
| ya | or | yaa |
| lekin | but | lakin |
| par | but; on | pe, pr |
| agar | if | agr |
| to | then (particle) | toh |
| isliye | so, therefore | is liye, isliyye |
| bhi | also | bhee |
| hi | only, just (emphasis) | hee |
| sirf | only | srf, sirph |
| na | not (in "na … na", "jab tak … na") | naa |
| nahi | no, not; T9 | nahin, nhi, nai, nahee |
| haan | yes; T9 | han, ha, haa |
| ji | polite particle | jee |

### 6.4 Postpositions and place words

| Write | Meaning | Not |
|---|---|---|
| ka / ki / ke | of | kaa, kee |
| ko | to | koh |
| se | from, with, by | say, sey |
| mein | in (CLDR) | me, mai, men, main |
| par | on, at | pe, pr |
| tak | until, up to | takk |
| liye | for (in "ke liye") | lie, liyе |
| saath | with | sath |
| beech | between | bich |
| bina | without | binaa |
| paas | near, with (someone) | pas |
| taraf | towards | tarf |
| se | through, by way of: "Apple se" | ke zariye (formal), ke through |
| hisaab | according to (in "ke hisaab se") | hisab |
| andar | inside | ander |
| baahar | outside | bahar |
| yahan | here | yaha, yahaan |
| wahan | there | vahan, waha, vahaan |
| yahin | right here | yaheen |

### 6.5 Time words

| Write | Meaning | Not |
|---|---|---|
| abhi | now (CLDR) | abhee |
| ab | now, from now on | |
| ab bhi | still | abhi bhi |
| aaj | today (CLDR) | aj |
| kal | tomorrow, yesterday (CLDR) | kall |
| din | day (CLDR) | dinn |
| hafta / hafte | week, weeks (CLDR) | hapta, hafthe |
| mahina / mahine | month, months; T9 (CLDR writes "maheena") | maheena, maheene, mahena |
| saal | year (CLDR) | sal |
| ghanta / ghante | hour, hours (CLDR) | ganta, ghantaa |
| pehle | before, first; T9 (CLDR writes "pahle") | pahle, pehele |
| baad | after | bad |
| baad mein | later | baadme, badme |
| phir | again, then | fir, fhir |
| phir se | again | firse, phirse |
| dobara | again, a second time; T9 | dobaara |
| hamesha | always | hamesa, humesha |
| hamesha ke liye | for good, permanently | |
| kabhi | ever, sometimes | kabhie |
| kabhi nahi | never; T9 | kabhi nahin |
| jaldi | soon, quickly | jaldee |
| turant | straight away | turanth, turunt |
| thodi der mein | in a moment | thodi der me, thori der mein |
| der | a while | derr |
| pichhla / pichhli | last, previous (CLDR) | pichla, pichhala |
| agla / agli | next (CLDR) | aglaa |
| shuru | the start: "shuru karne ke liye" | shuruaat (formal), shuruat |
| abhi tak | so far, yet | abhitak |

### 6.6 Verbs

Verbs are listed by their dictionary form, then the *aap* imperative, then the *tum*
imperative where the style uses it (§5.2).

| Write | Meaning | Not |
|---|---|---|
| hai / hain | is / are | he, h, hay, hein, hen |
| tha / thi / the | was, were | thaa |
| hoga / hogi / honge | will be | hogaa |
| hona | to be, happen | honaa |
| ho gaya / ho gayi | became, is done | hogaya, ho gya, ho gai |
| karna · karein · karo | to do | krna, karen, kare, kariye, kijiye, kro |
| kiya / ki / kiye | did | kia, kiyaa |
| sakna: sakta / sakti / sakte | can | skta, sakataa |
| dena · dein | to give | den, dijiye |
| lena · lein | to take | len, lijiye |
| chunna · chunein · chuno | to choose | chune, chuniye, choose karein |
| rakhna · rakhein · rakho | to keep | rakhen, rakhe |
| dekhna · dekhein | to see | dekhen |
| bhejna · bhejein | to send | bhejen, bheje |
| jodna · jodein · jodo | to add | jorna, joden |
| judna | to join, be added | jurna |
| badalna · badlein | to change | badalein, badlen |
| hataana · hataayein | to remove (things only) | hatana, hatayein, hataen |
| likhna · likhein · likho | to write | likhen |
| padhna · padhein | to read | parhna, padhen |
| kholna · kholein | to open | kholen |
| band karna | to close, stop | bandh karna |
| shuru karna | to begin | suru, shuroo |
| rukna · rukein | to wait, stop | rukiye, rukhna |
| wait karna | to wait for | raah dekhna (formal), intezaar karna |
| maangna | to ask for | mangna |
| poochhna | to ask (a question) | puchna, poochna |
| batana · batayein · batao | to tell; T9 | bataana, bataayein, bataao |
| dikhna | to be seen, appear | dikhai dena |
| dikhaana | to show | dikhana |
| milna | to get, meet | |
| pahunchna | to reach | pohochna, pahuchna, pahochna |
| koshish karna | to try | kosis, koshis |
| chahna · chahte hain | to want; T9 | chaahna, chaahte |
| chahiye | is needed; T9 | chaahiye, chaiye |
| paana · paya / payi / paye / payega | to manage to; T9 for the inflected forms | paaya, paayi, paaye |
| jaana · jayega / jayegi / jayenge | to go; T9 for the future forms | jana, jaayega, jaega |
| aana · aayega | to come | ana, ayega, aaega |
| wapas aana | to come back; T9 | waapas aana, vapas aana |
| wapas lena | to take back, withdraw; T9 | waapas lena |
| samajhna | to understand | samjhna |
| maanna | to accept | manna |
| raazi hona | to agree | razi hona |
| mana karna | to decline | manaa karna |
| rehna · rehta / rehti / rehte | to stay; T9 (but raha, rahi, rahe) | rahna, rahta, rahti |
| kehna · kehta / kehti / kehte | to say; T9 | kahna, kahte |
| khona · khoyega | to lose, be lost | khoega |
| chalu rehna | to keep going | jaari rakhna (formal), jari rakhna |
| istemaal karna | to use | istemal, istmaal |
| record hona | to be recorded | darj hona (formal) |

### 6.7 Nouns

| Write | Meaning | Not |
|---|---|---|
| baat / baatein | something said, a matter (f) | bat, baaten, baatain |
| baaton | (oblique plural) | baato |
| kaam / kaamon | work, task (m) | kam (that means less) |
| naam | name (m) | nam |
| sach | truth (m) | sacch |
| shabd / shabdon | word, words (m) | sabd |
| sawaal | question (m) | sawal, savaal |
| jawaab | answer (m) | jawab, javab |
| madad | help (f) | madat |
| bharosa | trust (m) | bharosaa |
| yaad | memory (f) | yad |
| rules | rules (m, plural) | niyam, niyamon (formal) |
| tareeka | way, method (m) | tarika |
| tarah | kind, manner (f) | tarha |
| wajah | reason (f) | vajah, wajeh |
| order | order, sequence (m): "usi order mein" | kram (formal) |
| galti | mistake (f) | ghalti |
| hissa | part (m) | |
| baari | turn (f): "aaraam ki baari" | (never "kram") |
| record | record (m) | |
| option | option (m) | |

### 6.8 Adjectives and adverbs

| Write | Meaning | Not |
|---|---|---|
| naya / nayi / naye | new | nya, nai, naii |
| puraana / puraani | old | purana, purani |
| pehla / pehli | first; T9 | pahla, pahli |
| aakhri | last | akhri, aakhiri |
| chhota / chhoti | small | chota |
| bada / badi | big | bara |
| theek | fine, right | thik |
| sahi | correct | sahee |
| galat | wrong | ghalat |
| zaroori | required | zaruri, jaroori |
| zaroor | certainly | jarur, zarur |
| khaali | empty, vacant | khali |
| poora / poori | complete | pura, puri |
| zyada | more, a lot; T9 | zyaada, jyada |
| kam | less | kum |
| thoda / thodi | a little | thora, thodaa |
| bahut | very | bohot, bahot, bhot |
| seedha / seedhi | straightforward | sidha |
| pyaar se | gently, kindly | narm, narmi se (formal) |
| alag | separate, different | |
| ek jaisa / ek jaisi | the same | ek jesa |
| taiyaar | ready | tayyar, taiyar |
| raazi | agreed, willing | razi |
| saaf | clear | saf |
| pakka | certain, settled | |
| baaki | remaining, the rest | baki, baqi |
| kaafi | enough | kafi |
| khaas | special | khas |
| ek / do / teen | one / two / three | tin |

### 6.9 Formal words replaced by everyday ones (owner decision, O3–O5)

Where the draft used a word that reads formal, it now uses the everyday word a Bangalore
product team would use. Each change:

| Draft (formal) | Now (everyday) | Where it changed |
|---|---|---|
| kram (order, sequence) | order: "usi order mein" | sentence 44, §5.7, §6.7 |
| kram, for the resting order | baari (turn): "aaraam ki baari kiski pehle aayegi" | sentence 37, §8.7 |
| niyam, niyamon (rules) | rules | sentence 45, §6.7 |
| darj hona (to be recorded) | record hona | sentence 48, §6.6 |
| raah dekhna (to wait for) | wait karna | sentence 35, §6.6 |
| ke zariye (through) | se: "Apple se" | sentence 33, §6.4, §8.7 |
| jaari rakhna (to keep on) | chalu rehna | sentences 37 and 38, §6.6 |
| narm (gentle) | pyaar se | sentence 50, §6.8 |
| shuruaat (beginning) | shuru karna: "shuru karne ke liye" | sentence 17, §6.5 |

Some words were kept because they read as everyday:

- **The careful words the owner accepted (O4):** insaan, saathi, aaraam, jagah, sujhaav.
- **Others:** raazi, istemaal, zaroori, taiyaar, turant, hisaab.

That is 241 rows across the first eight tables. Many rows carry several forms of one word,
so the list fixes well over 300 spellings.

---

## 7. Real sentences from the app, in this style

Taken from `main` at `5cf2c42` (see §1). Sentence 14 is also `history.concerns.empty`, and
sentence 19 is also `common.theme.note`, in `locales/en.json`. Placeholders such as `{payer}` stand where the app inserts a
name. Each line is a draft for the owner to correct. The note column says which rule the
line tests.

### 7.1 Buttons

| # | Where | English | Hinglish | Tests |
|---|---|---|---|---|
| 1 | `apps/mobile/app/ledger.tsx:116` | ＋ Hold a moment | ＋ Ek moment sambhalein | product verb, *aap* imperative |
| 2 | `apps/mobile/app/ledger.tsx:108` | ＋ New journey | ＋ Nayi journey | journey is feminine (C9) |
| 3 | `apps/mobile/app/ledger.tsx:86` | Share now | Abhi share karein | English stem plus "karein" (C8) |
| 4 | `apps/mobile/app/account.tsx:58` | Try again | Phir se koshish karein | Hindi for everyday words (C1, C7) |
| 5 | `apps/mobile/app/journey-settings.tsx:296` | Rest earlier · Rest later | Pehle aaraam · Baad mein aaraam | careful word "rest" (C5) |
| 6 | `apps/mobile/app/account.tsx:113` | Sign out everywhere | Har device se sign out karein | phone words stay English (C2) |
| 7 | `apps/mobile/app/journey-settings.tsx:199` | Propose this person | Is insaan ka sujhaav dein | never "propose karna" (C5) |

### 7.2 Errors

| # | Where | English | Hinglish | Tests |
|---|---|---|---|---|
| 8 | `apps/mobile/src/auth/account-messages.ts:6` | The account service could not complete that request. | Account service ye request poori nahi kar payi. | service and request are feminine |
| 9 | `apps/mobile/src/components/moment-card.tsx:135` | Photo could not be loaded. | Photo load nahi ho payi. | photo is feminine |
| 10 | `apps/mobile/src/api/client.ts:103` | Together Ledger can’t be reached right now. You’re still signed in. Try again in a moment. | Abhi Together Ledger se connection nahi ho pa raha. Aap ab bhi signed in hain. Thodi der mein phir se koshish karein. | English state word (C8); "ab bhi" |
| 11 | `src/app.js:2015` | The new passwords do not match. | Dono naye password ek jaise nahi hain. | "dono" (T9) |
| 12 | `apps/mobile/src/billing/store-purchase.ts:49` | This purchase did not start, and nothing was charged. Try again in a moment. | Ye purchase shuru nahi hua, aur aapse kuch bhi charge nahi hua. Thodi der mein phir se koshish karein. | money reassurance states a fact (§5.7) |

### 7.3 Empty states

| # | Where | English | Hinglish | Tests |
|---|---|---|---|---|
| 13 | `src/app.js:840` | Nothing has been written here yet. | Yahan abhi tak kuch nahi likha gaya hai. | passive, no gender for the reader |
| 14 | `apps/mobile/app/history.tsx:66` | Nothing to return to yet. Conversations you want to come back to together will appear here. | Abhi lautne ke liye kuch nahi hai. Jin baaton par aap dono saath lautna chahte hain, wo yahan dikhengi. | "chahte" (T9) |
| 15 | `apps/mobile/app/ledger.tsx:178` | A ledger can hold the things you want to remember, name, or return to. It begins empty. | Ek ledger mein wo baatein rakhi ja sakti hain jinhein aap yaad rakhna, naam dena, ya jin par phir se lautna chahte hain. Ye khaali shuru hota hai. | ledger stays English (C4) |
| 16 | `src/app.js:1224` | Nothing in this view. Choose another filter. | Is view mein kuch nahi hai. Koi aur filter chunein. | |
| 17 | `src/app.js:970` | A small truth is enough to begin. | Shuru karne ke liye ek chhota sa sach kaafi hai. | no pronoun, so no register question; "shuru karne", not "shuruaat" (§6.9) |
| 18 | `apps/mobile/app/ledger.tsx:164` | That can be a good place to rest. | Ye ruk kar aaraam karne ki sahi jagah ho sakti hai. | "aaraam" and "jagah" in their everyday sense |

### 7.4 Settings and account

| # | Where | English | Hinglish | Tests |
|---|---|---|---|---|
| 19 | `apps/mobile/app/settings.tsx:50` | Your theme changes only your own view. Each journeyer chooses what feels right on their screen. | Aapki theme sirf aapka apna view badalti hai. Har saathi ki screen par wahi theme hoti hai jo wo khud chune. | "saathi"; the verb avoids the reader's gender (§5.2) |
| 20 | `apps/mobile/src/auth/social-sign-in.ts:249` | A new account starts with your first name. You can change it in Account settings. | Naya account aapke first name se shuru hota hai. Ise Account settings mein badla ja sakta hai. | passive instead of "aap badal sakte hain" |
| 21 | `apps/mobile/app/new-journey.tsx:56` | Year, month and day, such as 2026-09-30. | Saal, mahina aur din, jaise 2026-09-30. | "mahina" (T9; CLDR writes "maheena") |
| 22 | `apps/mobile/app/account.tsx:95` | Signing out removes hosted journeys from this view without deleting them. | Sign out karne par hosted journeys is view se hat jaati hain, par delete nahi hotin. | English plural "journeys" (C8) |
| 23 | `apps/mobile/app/settings.tsx:75` | For help using Together Ledger, write to ledger-support@together-ledger.com. For anything about your privacy or your data, write to legal@together-ledger.com. | Together Ledger istemaal karne mein madad ke liye ledger-support@together-ledger.com par likhein. Apni privacy ya apne data se judi kisi bhi baat ke liye legal@together-ledger.com par likhein. | |

### 7.5 Notifications: emails and status lines

| # | Where | English | Hinglish | Tests |
|---|---|---|---|---|
| 24 | `server/mailer.js:68` (email subject) | You have been invited to a Together Ledger journey | Aapko ek Together Ledger journey mein invite kiya gaya hai | brand never translated |
| 25 | `server/mailer.js:80` (email subject) | Someone has been proposed for your Together Ledger journey | Aapki Together Ledger journey ke liye kisi ka sujhaav diya gaya hai | "sujhaav" (C5) |
| 26 | `server/mailer.js:90` (email subject) | Reset your Together Ledger password | Apna Together Ledger password reset karein | |
| 27 | `apps/mobile/src/journey/moment-actions.ts:81` | Moment shared with your journeyer. | Moment aapke saathi ke saath share ho gaya. | |
| 28 | `apps/mobile/src/journey/sharing-view.ts:318` | Everyone agreed. The invitation is on its way to them. | Sab raazi hain. Invitation unhein bheja ja raha hai. | "raazi" needs no gender |
| 29 | `src/app.js:2585` | You are offline. This journey is still here, and anything needing the account service will wait until you reconnect. | Aap offline hain. Ye journey yahin hai, aur jin kaamon ke liye account service chahiye, wo connection wapas aane tak rukenge. | |
| 30 | `apps/mobile/src/journey/waiting-moments.ts:170` | Your waiting moment was sent. | Aapka ruka hua moment bhej diya gaya. | |
| 31 | `apps/mobile/src/journey/sharing-view.ts:380` | Asked for 7 more days. Everyone in this journey can see it. | 7 din aur maange gaye. Is journey mein sab ise dekh sakte hain. | digits, invariant "din" |

### 7.6 Money

| # | Where | English | Hinglish | Tests |
|---|---|---|---|---|
| 32 | `apps/mobile/src/billing/store-products.ts:103` | A journey of two is free. Room for more people belongs to this journey, so it is the same on every device anyone here uses. | Do logon ki journey free hai. Aur logon ke liye jagah is journey ki hoti hai, isliye yahan koi bhi kisi bhi device par ho, wo ek jaisi rehti hai. | "jagah" for room; "rehti" (T9) |
| 33 | `apps/mobile/src/billing/store-products.ts:120` | Cancel it with Apple at least 24 hours before it renews to stop the next payment. | Agla payment rokne ke liye, renew hone se kam se kam 24 ghante pehle Apple se ise cancel karein. | money words stay English (C3); "Apple se", not "ke zariye" (§6.9) |
| 34 | `apps/mobile/src/billing/store-products.ts:127` | Every moment’s first place stays free. An extra place is paid for once, and stays with this moment for good. It never rests and never lapses. | Har moment ki pehli jagah free rehti hai. Ek extra jagah ka payment ek hi baar hota hai, aur wo hamesha ke liye is moment ke saath rehti hai. Wo na kabhi aaraam karti hai, na kabhi expire hoti hai. | "place" as location and "rest" in one sentence |
| 35 | `apps/mobile/src/journey/sharing-view.ts:362` (grace banner) | This journey is waiting on a payment from {payer}. 5 days left · 2 of 6 extra weeks asked for this year. If it isn't paid, only {names} can add new moments. Everyone else can still see everything, and nothing is lost. Paying again brings everyone back. | Ye journey {payer} ke payment ka wait kar rahi hai. 5 din baaki · is saal 6 mein se 2 extra hafte maange gaye. Agar payment nahi hua, to naye moment jodne ka option sirf {names} ke paas rahega. Baaki sab ab bhi sab kuch dekh sakenge, aur kuch bhi nahi khoyega. Payment phir se hone par sab dobara jod sakenge. | the hardest line: names without gender, rest without blame |
| 36 | `apps/mobile/src/billing/store-purchase.ts:177` | Your purchase is safe with the store, and it will be added when Together Ledger can check it. Nothing more will be charged. | Aapka purchase store ke paas safe hai, aur jaise hi Together Ledger ise check kar payega, ye jud jayega. Aapse aur kuch bhi charge nahi hoga. | "ise", not "use" (T8) |
| 37 | `apps/mobile/app/journey-settings.tsx:293` | Who rests first, if it isn't paid. The last person here keeps adding with you. | Agar payment nahi hua, to aaraam ki baari kiski pehle aayegi. Is list ke aakhri naam ke liye, aapke saath moment jodna chalu rahega. | "baari" and "chalu", not "kram" and "jaari" (§6.9) |
| 38 | `apps/mobile/app/journey-settings.tsx:295` | Resting now · Keeps adding with you | Abhi aaraam par · Aapke saath jodna chalu | state labels as noun phrases (§5.1) |

### 7.7 Privacy

| # | Where | English | Hinglish | Tests |
|---|---|---|---|---|
| 39 | `apps/mobile/src/journey/moment-actions.ts:11` | Share this moment now? | Ye moment abhi share karein? | consequence dialog in *aap* |
| 40 | `apps/mobile/src/journey/moment-actions.ts:12` | Everyone in this journey will be able to see it, including anyone who joins later. That access cannot be undone. | Is journey mein sab ise dekh payenge, unke saath wo log bhi jo baad mein judenge. Ye access wapas nahi liya ja sakta. | an irreversible step said plainly |
| 41 | `apps/mobile/app/moment.tsx:120` | Choose whether this stays with you, is shared now, or waits until you are ready. | Chunein ki ye sirf aapke paas rahe, abhi share ho, ya tab tak ruke jab tak aap taiyaar na hon. | |
| 42 | `apps/mobile/src/journey/moment-draft.ts:156` | Private stays with you. Shared now opens it to everyone in this journey, including anyone who joins later. Share later stays with you until you deliberately share it. | Private aapke paas hi rehta hai. Abhi share ise is journey mein sabke liye khol deta hai, unke liye bhi jo baad mein judenge. Baad mein share tab tak aapke paas rehta hai jab tak aap khud ise share na karein. | the three visibility labels |
| 43 | `apps/mobile/app/account.tsx:69` | Passwords are never shared between journeyers. | Password kabhi bhi saathiyon ke beech share nahi hote. | Hindi plural "saathiyon" (C8) |
| 44 | `apps/mobile/src/journey/waiting-moments.ts:149` | Kept on this phone until the service has them, and sent in the order you held them. Nobody else sees them before then. | Service tak pahunchne tak ye isi phone par rehte hain, aur ek-ek karke usi order mein bheje jaate hain jismein aapne inhein sambhala tha. Tab tak inhein koi aur nahi dekhta. | |
| 45 | `apps/mobile/app/delete-account.tsx:41` | Permanently delete this account? This follows the journey ownership rules shown here and cannot be undone. | Ye account hamesha ke liye delete karein? Ye yahan dikhaaye gaye journey ownership ke rules ke hisaab se hoga, aur ise wapas nahi kiya ja sakta. | deletion is never softened |

### 7.8 The careful words: another person, another place, invitation

| # | Where | English | Hinglish | Tests |
|---|---|---|---|---|
| 46 | `apps/mobile/src/journey/sharing-view.ts:148` | There is room to add another person, and everybody here has to agree to them. · There is no open place right now. | Ek aur insaan ke liye jagah hai, aur yahan sabka raazi hona zaroori hai. · Abhi koi jagah khaali nahi hai. | "ek aur insaan", "jagah" |
| 47 | `apps/mobile/src/journey/sharing-view.ts:278` | Their link stops working, and the place it held is free again straight away. The journey’s history keeps a record that it was withdrawn. | Unka link kaam karna band kar deta hai, aur jo jagah wo rok raha tha, wo turant phir se khaali ho jaati hai. Journey ki history mein ye record rehta hai ki invitation wapas liya gaya tha. | |
| 48 | `apps/mobile/src/journey/sharing-view.ts:283` | The question is taken back, and nothing is sent to them. Nobody is recorded as having refused, and this person can be proposed again later. | Sawaal wapas le liya jaata hai, aur unhein kuch nahi bheja jaata. Kisi ke naam mana karna record nahi hota, aur is insaan ka sujhaav baad mein phir se diya ja sakta hai. | |
| 49 | `src/app.js:1670` | Check-in complete. It can rest until tomorrow. | Check-in ho gaya. Ab ye kal tak aaraam kar sakta hai. | |

### 7.9 Writing hints in the moment editor: aap

Decided (O2): these stay *aap*.

| # | Where | English | Hinglish | Tests |
|---|---|---|---|---|
| 50 | `apps/mobile/app/moment.tsx:140` (hint) | Use your own words. Keep it simple and kind. | Apne shabdon mein likhein. Baat seedhi rakhein, aur pyaar se. | "pyaar se", not "narm" (§6.9) |
| 51 | `apps/mobile/app/moment.tsx:140` (label) | What would you like to hold? (Optional) | Kya sambhalna hai? (Optional) | no pronoun needed |
| 52 | `src/app.js:957` | Hold what happened in words that feel true. | Jo hua, wo un shabdon mein sambhalein jo sach lagein. | |

### 7.10 Check-ins and empty states: where tum goes

Decided (O2): *tum* goes only here. These lines are new in this revision. They show that
most of them need no pronoun. Where one is needed, the *aap* version sits beside it for
comparison.

| # | Where | English | Hinglish (tum) | aap, for comparison |
|---|---|---|---|---|
| 53 | `src/model.js:146` (check-in) | What feels important to name with care today? | Aaj kaun si baat dhyaan se kehna zaroori lagta hai? | (same: no pronoun) |
| 54 | `src/model.js:146` (check-in) | What is one thing you noticed and appreciated? | Ek baat batao jo tumne notice ki, aur jo tumhein pasand aayi. | Ek baat batayein jo aapne notice ki, aur jo aapko pasand aayi. |
| 55 | `src/model.js:146` (check-in) | Is there an open thread that would feel lighter with a small next step? | Kya koi khuli baat hai jo ek chhote se agle kadam se halki ho sakti hai? | (same: no pronoun) |
| 56 | `src/model.js:146` (check-in) | What boundary would help this journey feel more spacious? | Kaun si boundary is journey ko thoda aur khula bana sakti hai? | (same: no pronoun) |
| 57 | `src/model.js:146` (check-in) | What do we want to remember about this season together? | Is daur ke baare mein hum saath mein kya yaad rakhna chahte hain? | (same: "hum") |
| 58 | `src/app.js:970` (empty ledger) | ＋ Add your own | ＋ Apna khud ka jodo | ＋ Apna khud ka jodein |

---

## 8. Language tag and screen readers

Every claim in this section is marked with one of three labels:

- **Documented**: in Apple's, Google's, W3C's, Unicode's or a speech vendor's own documentation
  or source code. Each was read in an official copy hosted on GitHub, because the websites
  themselves were blocked (§1).
- **Anecdotal**: from user forums.
- **Untested**: nobody has observed it, and it has not been checked on a phone. **No screen
  reader was run while writing this.** Nothing below describes a result anyone heard.

### 8.1 The tag: `hi-Latn` is valid and means Hinglish (documented)

**The IANA subtag registry.** Registry file dated 2026-08-08, read in the copy kept in the
CLDR repository at
<https://raw.githubusercontent.com/unicode-org/cldr/main/tools/cldr-code/src/main/resources/org/unicode/cldr/util/data/language-subtag-registry>.

- It lists `hi` (Hindi) with `Suppress-Script: Deva`, and `Latn` (Latin) as a script.
- Hindi's default script is Devanagari. A Latin-script tag therefore adds exactly the
  information a script subtag is for.

**W3C, "Choosing a language tag".** <https://www.w3.org/International/questions/qa-choosing-language-tags>,
read in its source at <https://github.com/w3c/i18n-drafts>.

- Script subtags "should only be used … when the script adds some useful distinguishing
  information".
- A `Suppress-Script` entry is the sign of a script you should not add. `Latn` on Hindi is
  the opposite case.

**Unicode CLDR.** CLDR's specification (TR35, "Hybrid Locale Identifiers",
<https://github.com/unicode-org/cldr/blob/main/docs/ldml/tr35.md>) gives:

> `hi-Latn` | Latin | Hinglish | Hindi written in Latin script; in practice usually a hybrid with English

- **CLDR 41 (April 2022)** moved `hi_Latn` into its main data and "documented the use of
  hi-Latn for 'Hinglish'"
  (<https://github.com/unicode-org/cldr/blob/main/docs/site/downloads/cldr-41.md>).
- **CLDR's parent for `hi_Latn` is `en_IN`, not `hi`**
  (`common/supplemental/supplementalData.xml`: `<parentLocale parent="en_IN" locales="hi_Latn"/>`).
  Whatever `hi-Latn` does not define comes from Indian English. That is why its digits,
  grouping and month names are English (§2.4).

**Android.** AOSP's platform locale list includes `hi-Latn-IN`, "Hindi (Latin, India)", from
Android 14 onward, and not in Android 10–13
(`core/res/res/values/locale_config.xml`, <https://github.com/aosp-mirror/platform_frameworks_base>).

- Android 13 ships CLDR 40, which predates `hi_Latn` (version table:
  <https://developer.android.com/guide/topics/resources/internationalization>).
- Whether a given phone maker's Settings app offers it is **untested**.

**iOS.** **Untested** whether iOS offers Hindi (Latin) as a language at all. No Apple page was
found either way. An iOS "Hinglish" *keyboard* exists, per a user thread (**anecdotal**).

### 8.2 What the app's own formatting does (observed and documented)

**Observed (§2.4).** Node 22.22.0 formats `hi-Latn` from real CLDR data.

**Documented: the phone may not have the data.** Hermes, the JavaScript engine in the phone
app, takes `Intl` from the phone's own system. Its documentation says output therefore
varies between Android versions (<https://github.com/facebook/hermes/blob/main/doc/IntlAPIs.md>).

**Untested: what a phone without the data does.** On Android 13 or earlier there is no
`hi_Latn` data. ICU normally falls back by dropping the script, `hi-Latn` → `hi`. That would
mean Devanagari dates in a Latin-script interface. This is an inference.

**Already handled on main.** #418 formats Hinglish dates, numbers and money with `en-IN`
(`locales/languages.json`), which every phone and browser has. So this gap doesn't reach the
app.

It would matter again only if Hinglish's `formatting.locale` were changed to `hi-Latn`. In
that case, check `Intl.DateTimeFormat.supportedLocalesOf(['hi-Latn'])` first, and fall back
to `en-IN`, which is `hi_Latn`'s CLDR parent. Whether Chrome, Safari and Firefox include
`hi_Latn` is **untested**.

### 8.3 VoiceOver (iPhone)

**Documented: tags reach VoiceOver.**

- **Native app.** Apple's `accessibilitySpeechLanguage` takes "a BCP 47 language code … the
  rules for the specified language govern how to pronounce that string"
  (<https://developer.apple.com/documentation/foundation/nsattributedstring/key/accessibilityspeechlanguage>).
  React Native's `accessibilityLanguage` prop sets the matching UIKit property on iOS, and
  only on iOS
  (<https://github.com/facebook/react-native-website/blob/main/docs/accessibility.md>, and the
  React Native source).
- **Web app.** In Safari, WebKit's iOS accessibility code answers VoiceOver's language
  question with the nearest `lang` attribute (`languageIncludingAncestors()` in
  `WebAccessibilityObjectWrapperIOS.mm`, <https://github.com/WebKit/WebKit>). So
  `<html lang="hi-Latn">` reaches VoiceOver.

**Documented: the voices that exist.** Apple's VoiceOver language list includes Hindi and
English (India). No Hinglish or Hindi-in-Latin voice was found. (Seen in search only; the
page was blocked.)

**Untested: what VoiceOver does with each tag.**

- **`hi-Latn`:** whether VoiceOver picks the Hindi voice, ignores the tag, or falls back to
  the phone's own language. No Apple document says.
- **The Hindi voice reading Latin letters:** whether it reads "aaraam" as Hindi, or spells it
  out, or reads it as English.
- **`en-IN`:** whether the Indian English voice reads Hinglish acceptably. That is plausible,
  since the words are written in Latin, but untested.

**Anecdotal: VoiceOver detects language by script.** Users on AppleVis describe VoiceOver's
language detection as switching when it meets Devanagari letters. If so, Latin Hinglish would
never trigger it, and the tag the app declares would matter more.
<https://www.applevis.com/guides/deep-dive-voiceover-settings-ios-ipados>

### 8.4 TalkBack (Android)

**Documented: on the web, the tag reaches the Hindi voice with the script dropped.**

- Chrome on Android wraps text in a `LocaleSpan` for its `lang`
  (`AccessibilityNodeInfoBuilder.java` in Chromium).
- TalkBack reads `LocaleSpan`s and calls `setLanguage` on the speech engine
  (<https://github.com/google/talkback>, `FeedbackProcessingUtils.java` and
  `FailoverTextToSpeech.java`).
- Android's `TextToSpeech.setLanguage` passes the engine only the language, country and
  variant. **The script never reaches the speech engine**
  (`core/java/android/speech/tts/TextToSpeech.java` in AOSP).
- So on the web, `hi-Latn` asks for exactly the same voice as `hi`: the Hindi voice.

**Documented: the native app cannot pass a language at all.** React Native's
`accessibilityLanguage` is iOS-only, and the Android side of React Native never applies a
`LocaleSpan` (React Native source). TalkBack reads the phone app with whatever voice its own
settings choose, whatever tag we declare. Changing that would need a native module, and the
script would still be dropped.

**Documented: the voices that exist.** Google's list of TalkBack languages includes English
(India) and Hindi (India), and nothing for Hinglish or Hindi in Latin script
(<https://support.google.com/accessibility/android/answer/11101402>).

**Untested.** What Google's Hindi voice does with Latin-script text. No Google document says,
and no reliable user report was found.

### 8.5 Speech engines generally (documented, for context only)

Neither screen reader uses these engines. They do show that reading romanised Hindi well is a
special capability, not the default:

- **Amazon Polly (documented).** Polly documents one bilingual voice, Aditi, that reads
  Hindi, English and "Romanagari" (Hindi in Latin letters) correctly. Its example is "Usne
  kahan, khel toh ab shuru hoga".
  <https://github.com/awsdocs/amazon-polly-developer-guide/blob/master/doc_source/bilingual-voices.md>
- **Microsoft Azure (documented).** Azure's voice list has Hindi and Indian English voices,
  and no mention of Latin-script Hindi.
  <https://github.com/MicrosoftDocs/azure-ai-docs>
- **Google Cloud (untested).** Google Cloud's documentation could not be read.

### 8.6 Which tag the app should declare

**Content: declare `hi-Latn` (documented basis).**

- **Web:** set it on `<html lang>` when Hinglish is chosen.
- **Phone app:** use it as the app's language when Hinglish is chosen.
- **Formatting:** not `hi-Latn`. Dates, numbers and money use `en-IN`, as
  `locales/languages.json` already sets (§5.4).

*Reasons:*

- It is the true, valid description of the text, and the tag CLDR names for Hinglish.
- Search, translation tools and future speech engines can use it.
- `hi` would claim the text is in Devanagari.
- `en-IN` would claim the text is English, which misleads every tool that is not a speech
  engine.

**Speech: no override yet (untested).** Neither the web app nor the phone app should set a
separate speech language (iOS `accessibilityLanguage`) until the owner's check below has been
run. If the check shows the Indian English voice reads Hinglish better than the Hindi voice:

- **Phone app on iOS:** set `accessibilityLanguage="en-IN"` on Hinglish text.
- **Web app:** set `lang="en-IN"` on Hinglish text, keeping `hi-Latn` on `<html>`. This is a
  trade-off: it tells tools the text is English so that screen readers speak it well.
- **Phone app on Android:** the tag cannot change anything (§8.4).

That decision is open choice O7.

### 8.7 The check for the owner: five sentences, three tags, two phones

This takes about fifteen minutes and needs an iPhone, an Android phone, and a computer.

**Setup**

1. **iPhone.** Leave the phone's language as it is.
   - Settings → Accessibility → VoiceOver → Speech: note whether "Detect Languages" is on, and
     run the check once with it on.
   - Add Hindi under Rotor Languages if you can.
2. **Android.**
   - Settings → Accessibility → Text-to-speech output: install the Hindi (India) and English
     (India) voices for Speech Services by Google.
   - Note which engine and language are the default.
3. **The page.** Save the page below as `hinglish-check.html` and open it on each phone in the
   ordinary browser (Safari, Chrome). For example, email it to yourself and open the
   attachment, or open it from Files or Drive.

```html
<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>Hinglish screen-reader check</title>
<h1 lang="en">Tag: hi-Latn</h1>
<div lang="hi-Latn">
  <p>Ye moment abhi share karein?</p>
  <p>Ek aur insaan ke liye jagah hai, aur yahan sabka raazi hona zaroori hai.</p>
  <p>Agar payment nahi hua, to aaraam ki baari kiski pehle aayegi.</p>
  <p>Aap offline hain. Ye journey yahin hai.</p>
  <p>Renew hone se kam se kam 24 ghante pehle Apple se ise cancel karein.</p>
</div>
<h1 lang="en">Tag: hi</h1>
<div lang="hi">
  <p>Ye moment abhi share karein?</p>
  <p>Ek aur insaan ke liye jagah hai, aur yahan sabka raazi hona zaroori hai.</p>
  <p>Agar payment nahi hua, to aaraam ki baari kiski pehle aayegi.</p>
  <p>Aap offline hain. Ye journey yahin hai.</p>
  <p>Renew hone se kam se kam 24 ghante pehle Apple se ise cancel karein.</p>
</div>
<h1 lang="en">Tag: en-IN</h1>
<div lang="en-IN">
  <p>Ye moment abhi share karein?</p>
  <p>Ek aur insaan ke liye jagah hai, aur yahan sabka raazi hona zaroori hai.</p>
  <p>Agar payment nahi hua, to aaraam ki baari kiski pehle aayegi.</p>
  <p>Aap offline hain. Ye journey yahin hai.</p>
  <p>Renew hone se kam se kam 24 ghante pehle Apple se ise cancel karein.</p>
</div>
```

**Run it**

1. Turn on VoiceOver or TalkBack.
2. Swipe through the page one line at a time, from the top.
3. For each of the fifteen lines, write down three things:
   - **Voice:** which voice spoke it (Hindi, Indian English, or the phone's default English).
   - **Hindi words:** whether "aaraam", "zaroori", "jagah" and "baari" sounded like Hindi
     words.
   - **Numbers and English words:** whether "24", "payment", "Apple" and "cancel" sounded
     right.

**Record it**

| Phone | Tag | Voice heard | Hindi words natural? | Numbers and English words natural? |
|---|---|---|---|---|
| iPhone | hi-Latn | | | |
| iPhone | hi | | | |
| iPhone | en-IN | | | |
| Android | hi-Latn | | | |
| Android | hi | | | |
| Android | en-IN | | | |

**After the web check**

- **Phone app on Android:** check it once by opening any screen in the Together Ledger app
  with TalkBack on. It cannot be tagged (§8.4), so it will read with TalkBack's default
  voice whatever the table says.
- **Recording the results:** put them in this section, marked observed, with the phone
  models and system versions. They replace the "untested" lines above.

---

## 9. The owner's decisions, and what is still open

Decided by the owner on 12 October 2026, and applied throughout this document:

**O1. Spelling: decided, common spellings for everyday words.**

- Everyday words are written as people commonly type them: nahi, kuch, hum, haan, pehle,
  mahina, wapas and similar.
- They form a short, fixed exceptions list (§4, T9): twenty words with their listed forms.
- Every other word keeps the strict mapping (T1–T8).
- The spelling list (§6) and the sentences (§7) now match.
- A word joins T9 only by the owner's decision.

**O2. Where tum goes: decided, check-ins and empty states only** (§5.2, §7.10). Applying it
moved one rule. "Never both on one screen" became "never both in one block", because an empty
ledger's *tum* empty state shares the screen with an *aap* button.

**O3. journey and moment stay English: decided, as recommended** (C4). The glossary #418
added supports this for journey.

**O4. The careful words: decided, as recommended.**

- saathi (journeyer)
- aaraam (rest)
- ek aur insaan (another person)
- jagah (place and room)
- sujhaav dena (propose)

These are the `hi-Latn` values prompt 109 enters in `locales/glossary.json`.

**O5. Genders of English nouns: decided, as recommended** (C9).

**O3–O5, formal words.** Where a word reads formal, the everyday word wins. §6.9 lists each
of the nine changes.

**O6. Dates: settled on main by #418,** not by this document. `locales/languages.json`
formats Hinglish with `en-IN`, so dates read "12 October 2026", with no comma. §5.4 and §8
now follow that. There is nothing for the owner to decide unless they want a different
formatting locale.

**O7. The speech tag: still open.** Declare `hi-Latn` for content (§8.6). Whether to add an
`en-IN` speech override on iOS and the web waits on the owner's phone check (§8.7).

**O8. Emails: decided, as recommended.**

- Invitation emails stay in English.
- Hinglish is only ever sent to someone who chose it.
- Proposal and password emails follow the recipient's own setting, once emails are
  translated.

**O9. The Bangalore caution: noted, no change.**

**O10. "propose": settled with O4.** Accepting "sujhaav dena" keeps "propose karna" and its
romantic reading out of the app.

**Still for prompt 109 to raise:**

- **O11. Android's own Hindi (Latin).** Android 14 and later list `hi-Latn-IN` among the
  platform's locales (§8.1). Prompt 109 can also declare `hi-Latn` as a supported app
  language (Expo's `supportedLocales`), so Android 14 and later show it in the system's
  per-app language list. That is the owner's call when 109 is ready.
- **O12. The language's label.** `locales/languages.json` names Hinglish just "Hinglish"
  (`name` and `nativeName`). The owner's label is "Hinglish (Hindi in Latin script)" (§5.6).
  Prompt 109 should make them one.
