<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/dsh-contract-renewal-hero-en-dark.webp">
  <img src="docs/assets/dsh-contract-renewal-hero-en-light.webp" width="100%" alt="dsh-contract-renewal बैनर: quickstart के हर अनुबंध के लिए एक नवीनीकरण-विंडो पट्टी (चौड़ाई = उस अनुबंध का renewal_window_days), days_left अक्ष पर, बीच में as_of 2026-12-01 की खड़ी रेखा — DEMO-MSA-2026-001 16 दिन पहले समाप्त (60 दिन की विंडो), DEMO-NDA-2026-002 आज ही देय और विंडो के भीतर, DEMO-SAAS-2026-003 19 दिन शेष (60 दिन की विंडो), DEMO-LEASE-2026-004 45 दिन शेष पर 30 दिन की विंडो बीत चुकी इसलिए «N दिनों में», DEMO-SUPPORT-2026-005 120 दिन और केवल गिना जाता है (later); गणना 1 / 2 / 1 / 1, स्रोत samples/quickstart/expected/result.json">
</picture>

# dsh-contract-renewal

**अनुबंध दर्ज करें → किसी तिथि पर समाप्त / नवीनीकरण विंडो / N दिनों में देय देखें → CSV निर्यात करें।**

DeepSeek Harness के लिए पूरी तरह लोकल अनुबंध-समाप्ति रजिस्ट्री: हर पंक्ति में सात फ़ील्ड, तीन परस्पर अनन्य समूह और शेष दिन एक नज़र में — केवल तिथि और रजिस्ट्री का गणित, अनुबंध का पाठ पढ़ना नहीं, अनुस्मारक नहीं, नेटवर्क नहीं।

[इंस्टॉल](#तीन-चरणों-में-शुरुआत) · [कॉन्फ़िगरेशन](#कॉन्फ़िगरेशन) · [FAQ](#faq) · [简体中文](README.md) · [English](README.en.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

[![License](https://img.shields.io/badge/license-Apache--2.0-3366CC?style=flat-square&labelColor=2B3245)](LICENSE)
[![DSH](https://img.shields.io/badge/DSH-%E2%89%A50.2.1%20%3C0.4.0-4B67B4?style=flat-square&labelColor=2B3245)](#संगतता)
[![npm](https://img.shields.io/npm/v/dsh-contract-renewal?style=flat-square&labelColor=2B3245&color=CB3837)](https://www.npmjs.com/package/dsh-contract-renewal)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-contract-renewal/ci.yml?branch=main&label=CI&style=flat-square&labelColor=2B3245)](https://github.com/PerryLink/dsh-contract-renewal/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%E2%89%A524.9%20%3C25-339933?style=flat-square&labelColor=2B3245)](#संगतता)

[![Stars](https://img.shields.io/github/stars/PerryLink/dsh-contract-renewal?style=flat-square&labelColor=2B3245)](https://github.com/PerryLink/dsh-contract-renewal/stargazers)
[![npm downloads](https://img.shields.io/npm/dm/dsh-contract-renewal?style=flat-square&labelColor=2B3245&color=CB3837)](https://www.npmjs.com/package/dsh-contract-renewal)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-contract-renewal?metric=downloads)](https://dshfind.com/plugins/PerryLink/dsh-contract-renewal?ref=badge)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-C71D23?style=flat-square&labelColor=2B3245&logo=gitee)](https://gitee.com/perrylink/dsh-contract-renewal)

```sh
dsh plugin --profile <profile> add dsh-contract-renewal
```

</div>

<sub>समुदाय प्लगइन, DeepSeek से संबद्ध नहीं। आधिकारिक रिपॉज़िटरी: <https://github.com/PerryLink/dsh-contract-renewal> (Gitee एक मिरर है); अन्य खातों की समान-नाम वाली रिपॉज़िटरी से इसका कोई संबंध नहीं है।</sub>

<sub>स्थिति: alpha / सार्वजनिक सिंथेटिक / partial / not counted / GA नहीं — कोई ग्राहक डेटा नहीं, कोई ग्राहक प्रमाण नहीं, और उत्पादन-उपलब्धता का कोई दावा नहीं।</sub>

## यह क्या है

एक वाक्य में: अनुबंध का मेटाडेटा (संख्या, पक्षकार, आरंभ/समाप्ति तिथि, नवीनीकरण विंडो के दिन, ज़िम्मेदार व्यक्ति और राशि) लोकल रजिस्ट्री में रखें, किसी एक `as_of` तिथि पर उसे तीन समूहों — समाप्त, नवीनीकरण विंडो में, और N दिनों में देय — में बाँटें, शेष दिनों के साथ, और फिर CSV निर्यात करें।

> यह केवल तिथि और रजिस्ट्री का गणित करता है। यह अनुबंध का पाठ **नहीं** पढ़ता, धाराओं का निर्णय नहीं करता, अनुस्मारक नहीं भेजता और कानूनी सलाह का विकल्प नहीं है।

- **उपयुक्त**: कानूनी, खरीद या प्रशासनिक टीम के पास अनुबंधों का बैच हो और एक ही मापदंड पर देखना हो कि «कौन समाप्त हो चुके हैं और किनका नवीनीकरण करना है»; समीक्षक को देने के लिए रजिस्ट्री और देय सूची हो; विश्लेषण या किसी अन्य सिस्टम में लोड करने के लिए लोकल CSV चाहिए हो।
- **उपयुक्त नहीं**: अनुबंध के PDF/Word पढ़ना (इसके लिए `dsh-legal-clause`); ईमेल प्राप्त करना और डुप्लिकेट हटाना (इसके लिए `dsh-legal-intake`); स्वचालित नवीनीकरण मेल भेजना या OA/CLM कॉल करना; अनुमोदन और भूमिका-आधारित अनुमतियों वाला बहु-किरायेदार अनुबंध सिस्टम; यह तय करना कि किसी अनुबंध का नवीनीकरण होना चाहिए या नहीं।

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/dsh-contract-renewal-flow-v5-dark.svg">
  <img src="docs/assets/dsh-contract-renewal-flow-v5-light.svg" width="100%" alt="dsh-contract-renewal संरचना: लेखन पक्ष (contract_ingest) contracts.csv के 7 फ़ील्ड जाँचता है — सख्त ISO तिथियाँ, केस-असंवेदी अद्वितीय संख्या, विंडो 0–3650, राशि अधिकतम दो दशमलव — और $DSH_HOME/storages/dsh-contract-renewal/contracts.jsonl में जोड़ता है (R1, append-only); पठन पक्ष days_left = end_date − as_of को UTC दिनों में निकालकर चार क्रमिक अनन्य परीक्षण लगाता है: days_left < 0 → expired, 0 ≤ days_left ≤ w (renewal_window_days) → in_renewal_window, w < days_left ≤ N (within_days, डिफ़ॉल्ट 90) → expiring_soon, > N → केवल counts.later; दो निर्गम: contract_upcoming तीन समूह और counts देता है (R0), contract_report सभी 5 पंक्तियाँ sha256 / rows / bytes के साथ exports/ में CSV लिखता है (R1)">
</picture>

## तीन चरणों में शुरुआत

1. **इंस्टॉल करें** (कोई एक चैनल चुनें):

   ```sh
   # npm चैनल (अनुशंसित, प्रकाशित संस्करण)
   dsh plugin --profile <profile> add dsh-contract-renewal
   # git चैनल (नवीनतम main; git+https://github.com/PerryLink/dsh-contract-renewal.git के बराबर)
   dsh plugin --profile <profile> add github:PerryLink/dsh-contract-renewal
   # tarball चैनल: इस रेपो में pnpm pack के बाद
   dsh plugin --profile <profile> add ./dsh-contract-renewal-<version>.tgz
   ```

2. **न्यूनतम कॉन्फ़िगरेशन** (कोई Config कुंजी नहीं; `cordis.patch.yml` बस यह एक पंक्ति जोड़ता है):

   ```yaml
   - insert:
       - id: dsh-contract-renewal
         name: dsh-contract-renewal
   ```

3. **जाँचें कि माउंट हुआ**:

   ```sh
   dsh --profile <profile> --dump-config | grep dsh-contract-renewal
   node samples/quickstart/run.mjs --check
   ```

**अनइंस्टॉल**: `dsh plugin --profile <profile> remove dsh-contract-renewal` (या प्रोफ़ाइल पैच से वह पंक्ति हटा दें)।

## मुख्य क्षमताएँ

टूल के नाम स्थिर API हैं; विवरण रनटाइम आउटपुट से मेल खाने के लिए अंग्रेज़ी में रखे गए हैं। नाम केवल ASCII अक्षर, अंक और अंडरस्कोर रखते हैं और provider के `tools[].name` नियम `^[a-zA-Z0-9_-]+$` से मेल खाते हैं।

| टूल | उद्देश्य | जोखिम |
|---|---|---|
| `contract_ingest` | एक अनुबंध `contracts.jsonl` में दर्ज करता है; गलत तिथि/डुप्लिकेट के लिए स्थिर कोड | R1 local write |
| `contract_upcoming` | `as_of` से समूह बनाकर `days_left` देता है; डिफ़ॉल्ट आज (UTC) और 90 दिन | R0 |
| `contract_report` | उद्धरण-एस्केप वाला CSV निर्यात करके पथ, sha256, पंक्तियाँ और बाइट देता है | R1 local write |

- **तीन अनन्य समूह, प्रति अनुबंध एक पंक्ति** — `expired`, `in_renewal_window` और `expiring_soon` (N दिनों में देय पर अभी विंडो में नहीं); बाकी केवल `counts.later` में गिने जाते हैं, इसलिए दोहरी गिनती नहीं होती।
- **केवल-जोड़ने वाली लोकल रजिस्ट्री** — `$DSH_HOME/storages/dsh-contract-renewal/contracts.jsonl` में प्रति पंक्ति एक JSON ऑब्जेक्ट; अनुबंध की फ़ाइलें कभी पढ़ी या बदली नहीं जातीं, और नवीनीकरण नए नंबर से दर्ज होता है ताकि इतिहास बना रहे।
- **UTC कैलेंडर दिन** — हर तिथि घटाने से पहले UTC दिन-संख्या बनती है, इसलिए लोकल टाइमज़ोन, DST और `TZ` परिणाम को नहीं खिसका सकते।
- **सत्यापन-योग्य CSV निर्यात** — RFC 4180 उद्धरण के साथ `sha256`, पंक्ति और बाइट गणना; फ़ाइल नाम एक ही सुरक्षित घटक होना चाहिए और सीमा लाँघने वाले पथ अस्वीकार होते हैं।
- **बंद-विफलता** — गलत तिथि, डुप्लिकेट, सीमा से बाहर विंडो और असुरक्षित पथ `<मानवीय वाक्य>（E_CONTRACT_XXX）｜Next: <एक कार्रवाई>` लौटाते हैं, चुपचाप विफल नहीं होते।

### समूहों की सटीक सीमाएँ

1. `end_date < as_of` → `expired`, `days_left` ऋणात्मक।
2. `0 ≤ days_left ≤ renewal_window_days` → `in_renewal_window`; 0 (आज देय) और विंडो का आकार दोनों अंदर हैं।
3. विंडो के बाहर और `days_left ≤ within_days` → `expiring_soon`; ठीक `within_days` अंदर है, `within_days + 1` नहीं।
4. बाकी सब → `later`, केवल गिना जाता है, लौटाया नहीं जाता।

## इनपुट

- एक रजिस्ट्री CSV या प्रति अनुबंध एक `contract_ingest` कॉल। हर पंक्ति में सात फ़ील्ड:
  `contract_no` (अद्वितीय), `counterparty`, `start_date`, `end_date` (सख्त `YYYY-MM-DD`), `renewal_window_days` (0–3650 पूर्णांक), `owner`, `amount` (ऋणात्मक नहीं, अधिकतम दो दशमलव)।
- तिथियाँ वास्तविक ISO तिथियाँ होनी चाहिए। `2026-02-30`, `2026-13-01` और `2026/12/01` सभी `E_CONTRACT_DATE_INVALID` देते हैं।
- एक रजिस्ट्री के भीतर अनुबंध संख्याएँ केस-असंवेदनशील रूप से अद्वितीय हैं; डुप्लिकेट `E_CONTRACT_DUPLICATE` देता है।
- रजिस्ट्री `$DSH_HOME/storages/dsh-contract-renewal/contracts.jsonl` में रहती है (प्रति पंक्ति एक JSON ऑब्जेक्ट)। अनुबंध की फ़ाइलें कभी पढ़ी या बदली नहीं जातीं।

## आउटपुट

- `contract_ingest`: `{ contract_no, counterparty, start_date, end_date, renewal_window_days, owner, amount, total }`, जहाँ `total` रजिस्ट्री की पंक्ति-संख्या है।
- `contract_upcoming`: `{ as_of, within_days, expired, in_renewal_window, expiring_soon, counts }`; हर आइटम में `days_left` (ऋणात्मक = समाप्त) और `status` है।
- `contract_report`: पथ, फ़ाइल नाम, `sha256`, पंक्तियाँ, बाइट और `as_of`; CSV `$DSH_HOME/storages/dsh-contract-renewal/exports/` में लिखा जाता है।

तीन समूह **परस्पर अनन्य** हैं — किसी `as_of` पर एक अनुबंध अधिकतम एक बार आता है:

| समूह | नियम | टिप्पणी |
|---|---|---|
| `expired` | `days_left < 0` | हमेशा सूचीबद्ध, चाहे कितना भी पुराना समाप्त हुआ हो |
| `in_renewal_window` | `0 ≤ days_left ≤ renewal_window_days` | नवीनीकरण विंडो «N दिन» समूह पर प्राथमिकता रखती है |
| `expiring_soon` | विंडो में नहीं और `days_left ≤ within_days` | N दिनों में देय पर अभी विंडो में नहीं |
| लौटाया नहीं | बाकी सब | केवल `counts.later` में गिना जाता है |

`as_of` डिफ़ॉल्ट **आज (UTC)** है; `within_days` डिफ़ॉल्ट 90 है। सारा तिथि-गणित UTC कैलेंडर दिनों पर है, इसलिए लोकल टाइमज़ोन, DST और `TZ` परिणाम नहीं बदल सकते।

## उदाहरण

यह वाक्य कॉपी करें:

> इन 5 अनुबंधों को दर्ज करें और 2026-12-01 की तिथि पर दिखाएँ कि कौन समाप्त हो चुके हैं, कौन नवीनीकरण विंडो में हैं और कौन 90 दिनों में देय हैं; फिर एक CSV निर्यात करें।

### टूल-सतह कॉल

```sh
# 1) एक अनुबंध दर्ज करें
#    टूल सतह: contract_ingest({ contract_no: "DEMO-MSA-2026-001", counterparty: "…",
#              start_date: "2026-01-01", end_date: "2026-11-15",
#              renewal_window_days: 60, owner: "王敏", amount: 128000 })

# 2) किसी तिथि पर तीन समूह देखें
#    टूल सतह: contract_upcoming({ as_of: "2026-12-01", within_days: 90 })

# 3) CSV निर्यात करें
#    टूल सतह: contract_report({ as_of: "2026-12-01", filename: "contracts-2026-12-01.csv" })
```

साथ दिया नमूना दोबारा चलाएँ और गोल्डन फ़ाइल जाँचें:

```sh
node samples/quickstart/run.mjs --check
```

![dsh-contract-renewal quickstart का वास्तविक टर्मिनल आउटपुट](docs/assets/quickstart.png)

नमूना पाँच सिंथेटिक `DEMO-*` अनुबंध हैं, `as_of=2026-12-01` और `within_days=90` के साथ:

```text
expired: DEMO-MSA-2026-001 2026-11-15 (-16 days)
window:  DEMO-NDA-2026-002 2026-12-01 (0 days, window 30)
window:  DEMO-SAAS-2026-003 2026-12-20 (19 days, window 60)
soon:    DEMO-LEASE-2026-004 2027-01-15 (45 days, window 30)
later:   DEMO-SUPPORT-2026-005 2027-03-31 (120 days) — केवल counts.later में
```

`samples/quickstart/expected/result.json` `node samples/quickstart/run.mjs --json` का वास्तविक आउटपुट है, हाथ से लिखा नहीं; स्क्रीनशॉट `--check` का वास्तविक टर्मिनल आउटपुट है (मूल लॉग [`docs/assets/quickstart.log`](docs/assets/quickstart.log) में)।

नमूने में दो पक्षकार जान-बूझकर कॉमा और उद्धरण रखते हैं — `Northwind "APAC" Ltd.` और कॉमा वाला एक चीनी कंपनी नाम — ताकि CSV के दोनों एस्केप जाँचे जाएँ; पहला अनुबंध दोबारा दर्ज करने पर `E_CONTRACT_DUPLICATE` मिलता है।

## कॉन्फ़िगरेशन

इस प्लगइन में **कोई Config कुंजी नहीं** है — `cordis.patch.yml` बस ऊपर की पंक्ति जोड़ता है और माउंट होते ही तीनों टूल उपलब्ध हैं। जो भी समायोज्य है वह टूल कॉल के पैरामीटर पर है:

| टूल | पैरामीटर | आवश्यक | डिफ़ॉल्ट | अर्थ |
|---|---|---|---|---|
| `contract_ingest` | सात अनुबंध फ़ील्ड | हाँ | — | संख्या, पक्षकार, आरंभ/समाप्ति तिथि, नवीनीकरण विंडो, ज़िम्मेदार व्यक्ति, राशि |
| `contract_upcoming` | `as_of` | नहीं | आज (UTC) | समूहन तिथि, `YYYY-MM-DD`; «आज» दोहराने के लिए स्पष्ट रूप से दें |
| `contract_upcoming` | `within_days` | नहीं | `90` | «N दिनों में देय» का N, 0–3650 पूर्णांक |
| `contract_report` | `as_of` | नहीं | आज (UTC) | निर्यात में प्रयुक्त समूहन तिथि |
| `contract_report` | `within_days` | नहीं | `90` | निर्यात में प्रयुक्त N |
| `contract_report` | `filename` | नहीं | `contracts-<as_of>.csv` | केवल `[A-Za-z0-9._-]`; कोई पथ नहीं |

प्रोफ़ाइल पैच उदाहरण (कोई config ब्लॉक नहीं, केवल पहचान पंक्ति):

```yaml
- insert:
    - id: dsh-contract-renewal
      name: dsh-contract-renewal
```

परीक्षणों में लोकल राइट रूट को `DSH_CONTRACT_HOME` एनवायरनमेंट वेरिएबल से बदला जा सकता है; डिफ़ॉल्ट ठीक `$DSH_HOME/storages/dsh-contract-renewal` है।

## FAQ

<details>
<summary>पुराने समाप्त अनुबंध अभी भी सूची में क्यों आते हैं?</summary>

छूटे नवीनीकरण सामने लाना ही `expired` समूह का उद्देश्य है, इसलिए उसे `within_days` से नहीं काटा जाता। आइटम `days_left` के अनुसार क्रमबद्ध होते हैं, सबसे अधिक विलंबित सबसे पहले।

</details>

<details>
<summary>क्या कोई अनुबंध «N दिनों में देय» और «नवीनीकरण विंडो» दोनों में आ सकता है?</summary>

नहीं। समूह परस्पर अनन्य हैं: पहले समाप्त, फिर नवीनीकरण विंडो, अंत में N-दिन समूह। यदि `within_days=30` है पर किसी अनुबंध की विंडो 60 दिन है, तो 45 दिन शेष होने पर भी वह `in_renewal_window` में रहता है।

</details>

<details>
<summary>क्या टाइमज़ोन तिथि को एक दिन खिसका सकता है?</summary>

नहीं। घटाने से पहले तिथियाँ UTC दिन-संख्या में बदलती हैं; लोकल समय या DST का कोई गणित नहीं है। `as_of` छोड़ने पर आज का UTC लिया जाता है। टेस्ट सूट वही डेटा `TZ=UTC`, `America/Los_Angeles` और `Pacific/Kiritimati` में चलाकर आउटपुट बाइट-दर-बाइट तुलना करता है।

</details>

<details>
<summary>नवीनीकृत अनुबंध कैसे अपडेट करें?</summary>

रजिस्ट्री केवल-जोड़ने वाली है। नए अनुबंध नंबर से दर्ज करें, जैसे `DEMO-MSA-2026-001-v2`, और पुरानी पंक्ति इतिहास के लिए रखें। `contracts.jsonl` को हाथ से न बदलें।

</details>

<details>
<summary>क्या यह PDF पढ़ता है, अनुस्मारक भेजता है या कुछ अपलोड करता है?</summary>

नहीं। यह केवल रजिस्ट्री की तिथियों और राशि का गणित करता है: अनुबंध का पाठ पढ़ना नहीं, ईमेल/OA कॉल नहीं, नेटवर्क नहीं, मॉडल कॉल नहीं। धारा-कवरेज के लिए `dsh-legal-clause` साथ में उपयोग करें।

</details>

## अनुमतियाँ और डेटा

पढ़ना: उपयोगकर्ता द्वारा दिया गया अनुबंध रजिस्ट्री CSV (नमूना: `samples/quickstart/input/contracts.csv`); कोई अन्य डायरेक्टरी नहीं, अनुबंध का मूल फ़ाइल नहीं।  
लिखना: `$DSH_HOME/storages/dsh-contract-renewal/` (`contracts.jsonl` और `exports/*.csv`); मूल फ़ाइलें अछूती रहती हैं।  
नेटवर्क: नहीं।  
बाहरी सिस्टम: कोई नहीं।

`contract_upcoming` **R0** है (केवल-पठन); `contract_ingest` और `contract_report` **R1** हैं (लोकल लेखन, केवल ऊपर की डायरेक्टरी तक सीमित)। परीक्षणों में `DSH_CONTRACT_HOME` लोकल राइट रूट बदलता है; डिफ़ॉल्ट ठीक `$DSH_HOME/storages/dsh-contract-renewal` है।

## त्रुटि कोड

| कोड | कब आता है | अगला कदम |
|---|---|---|
| `E_CONTRACT_DATE_INVALID` | तिथि वास्तविक `YYYY-MM-DD` नहीं है (जैसे `2026-02-30`, `2026/12/01`, समय वाली ISO स्ट्रिंग) | सख्त `YYYY-MM-DD` और वास्तव में मौजूद तिथि दें |
| `E_CONTRACT_DUPLICATE` | वही नंबर रजिस्ट्री में पहले से है (केस-असंवेदनशील) | नवीनीकरण के लिए नया नंबर दर्ज करें (जैसे `-v2`) और इतिहास रखें |
| `E_CONTRACT_DATE_RANGE` | समाप्ति तिथि आरंभ तिथि से पहले है | जाँचें कि `start_date` / `end_date` उलटे नहीं हैं |
| `E_CONTRACT_WINDOW_INVALID` | नवीनीकरण विंडो या N-दिन सीमा 0–3650 का पूर्णांक नहीं है | 0–3650 का पूर्णांक दें, जैसे `renewal_window_days: 60` |
| `E_CONTRACT_AMOUNT_INVALID` | राशि ऋणात्मक है, दो से अधिक दशमलव हैं या 1e12 से अधिक है | सादा संख्या दें, अधिकतम दो दशमलव; राशि न हो तो `0` लिखें |
| `E_CONTRACT_FIELD_REQUIRED` / `E_CONTRACT_FIELD_INVALID` | कोई आवश्यक फ़ील्ड खाली है, या नाम में नई पंक्ति/टैब/अत्यधिक लंबाई है | फ़ील्ड भरें; पक्षकार ≤200 अक्षर, ज़िम्मेदार व्यक्ति ≤120 |
| `E_CONTRACT_NO_INVALID` | नंबर अक्षर/अंक से शुरू नहीं होता या अन्य अक्षर हैं (अधिकतम 64) | इसे फिर लिखें, जैसे `DEMO-MSA-2026-001` |
| `E_CONTRACT_STORE_FAILED` | रजिस्ट्री पढ़ी या लिखी नहीं जा सकती | सुनिश्चित करें कि `$DSH_HOME/storages/dsh-contract-renewal` लिखने योग्य है |
| `E_CONTRACT_EXPORT_FAILED` / `E_CONTRACT_PATH_INVALID` / `E_CONTRACT_PATH_NOT_ALLOWED` | CSV लिखना विफल, फ़ाइल नाम असुरक्षित, या पथ निर्यात डायरेक्टरी से बाहर | `filename` में केवल `[A-Za-z0-9._-]` दें |

त्रुटि का प्रारूप: `<मानवीय वाक्य>（E_CONTRACT_XXX）｜Next: <एक कार्रवाई>`। पूरा विश्लेषण [TROUBLESHOOTING.md](TROUBLESHOOTING.md) में है।

## स्वीकृति प्रमाण

सार्वजनिक/सिंथेटिक फ़िक्स्चर `samples/quickstart/` में हैं; `ACCEPTANCE.csv` जाँच दर्ज करता है (quickstart पंक्ति के अलावा सब `counted=false`)।

| req_id | metric | threshold | actual | pass | source | counted |
|---|---|---|---|---|---|---|
| CR-A03 | upcoming groups | 1 expired / 2 window / 1 soon / 1 later | 1/2/1/1 | true | public/synthetic | false |
| CR-A04 | window boundary days_left | -16\|0/30 | -16\|0/30 | true | public/synthetic | false |
| CR-A07 | CSV quoting | comma+quote escaped | escaped | true | public/synthetic | false |
| CR-QS01 | quickstart golden | 1/1 | 1 | true | synthetic/quickstart | true |

*ये फ़िक्स्चर-आधारित स्वीकृति पंक्तियाँ हैं, ग्राहक रन नहीं; कोई आउटपुट गढ़ा नहीं गया।*

## सीमाएँ और ज्ञात सीमाएँ

- केवल रजिस्ट्री और तिथि-गणित; अनुबंध का पाठ पढ़ना, धारा-समीक्षा या कानूनी निर्णय नहीं।
- स्वचालित नवीनीकरण सूचना नहीं; ईमेल, OA, CLM, ई-हस्ताक्षर या कोई बाहरी सिस्टम नहीं।
- केवल-जोड़ने वाला JSONL: जगह पर अपडेट/हटाना नहीं। नवीनीकरण के लिए नया नंबर दर्ज करें।
- विशिष्टता केस-असंवेदनशील है (`toUpperCase()`); यदि आपकी क्रमांकन प्रणाली केस-संवेदी है तो सफ़िक्स जोड़ें।
- राशि सत्यापन: ऋणात्मक नहीं, ≤ 2 दशमलव और ≤ 1e12; मुद्रा रूपांतरण, कर या विनिमय नहीं।
- तिथियाँ वर्ष 1000–9999 तक सीमित; विंडो और `within_days` 0–3650 पूर्णांक।
- CSV केवल RFC 4180 है; फ़ॉर्मूला उपसर्ग नहीं हटाए जाते। अविश्वसनीय CSV को Excel में सीधे न खोलें।
- केवल सार्वजनिक/सिंथेटिक नमूने; alpha/partial, not counted, GA या उत्पादन-उपलब्धता का दावा नहीं।

## संगतता

| आयाम | स्थिति |
|---|---|
| Harness | `dsh >=0.2.1-rc.3 <0.4.0` |
| Node | `>=24.9.0 <25` |
| प्लेटफ़ॉर्म | सभी; केवल लोकल फ़ाइलें |
| डेटा | नेटवर्क नहीं, मॉडल कॉल नहीं, अपलोड नहीं |

वर्तमान संस्करण `0.2.0`, 24 परीक्षण पास (`node --test test/*.test.mjs`)।

## पारिस्थितिकी और गुणवत्ता

- [Gitee मिरर](https://gitee.com/perrylink/dsh-contract-renewal) (सिंक किया गया मिरर; GitHub आधिकारिक है)
- [dshfind प्लगइन पेज](https://dshfind.com/plugins/PerryLink/dsh-contract-renewal) (इंस्टॉल और रैंकिंग)
- **1024 स्टोर चैनल**: पहले `npm i -g dsh1024`, फिर `dsh1024 plugin --profile <profile> add dsh-contract-renewal` ([deepseek1024.com](https://deepseek1024.com) की इंस्टॉल रैंकिंग में गिना जाता है)
- [पारिस्थितिकी फ़ील्ड गाइड](https://perrylink.github.io/dsh-plugin-guide/): प्लगइन विकास गाइड · मापे गए चयन डेटा · रखरखाव के निर्णय

## संबंधित परियोजनाएँ

- [dsh-legal-intake](https://github.com/PerryLink/dsh-legal-intake) — कानूनी ईमेल प्राप्ति, डुप्लिकेट हटाना और वर्गीकरण
- [dsh-legal-clause](https://github.com/PerryLink/dsh-legal-clause) — धारा-वृक्ष और 12-कुंजी कवरेज
- [dsh-contract-pack](https://github.com/PerryLink/dsh-contract-pack) — तीनों प्लगइन एक एंड-टू-एंड परिदृश्य के रूप में

## विकास

```sh
pnpm install
pnpm build && pnpm lint && pnpm typecheck
node --test test/*.test.mjs
node scripts/gate.mjs
```

README की छवियाँ [`scripts/gen-readme-assets.py`](scripts/gen-readme-assets.py) से बनती हैं: बैनर में पाँच नमूना अनुबंध Pillow से नवीनीकरण-विंडो पट्टियों के रूप में बनते हैं, संरचना चित्र हाथ से लिखा SVG चार श्रेणियों की सीढ़ी है, और हर संख्या quickstart गोल्डन `samples/quickstart/expected/result.json` से पढ़ी जाती है; हल्का और गहरा दोनों संस्करण कभी भी दोबारा चलाए जा सकते हैं। `docs/assets/quickstart.png` वास्तविक रन का कैप्चर है और `docs/assets/quickstart.log` के साथ रखा गया है।

Topics: `dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `contract`, `renewal`, `expiry`, `legal`, `csv`, `perrylink`

## परिवार और धन्यवाद

यह परियोजना [PerryLink](https://github.com/PerryLink) द्वारा अनुरक्षित DeepSeek Harness प्लगइन परिवार की सदस्य है (सभी Apache-2.0)। यदि यह प्लगइन आपके काम आए, तो **स्टार दें** — इससे कोई सुविधा नहीं खुलती, पर अगले व्यक्ति को इसे खोजना आसान हो जाता है।

- [@PerryLink](https://github.com/PerryLink) — निर्माता और अनुरक्षक: अनुबंध रजिस्ट्री और UTC तिथि इंजन, तीन अनन्य समूह, CSV निर्यात और पथ-सुरक्षा, quickstart गोल्डन नमूना और पाँच-भाषा दस्तावेज़।

## लाइसेंस

[LICENSE](LICENSE) (Apache License 2.0) © 2026 dsh-contract-renewal contributors. `NOTICE` भी देखें।

<p align="center"><sub>Apache-2.0 · समुदाय प्लगइन, DeepSeek से संबद्ध नहीं।</sub></p>
