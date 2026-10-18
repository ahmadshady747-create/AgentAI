# كتيب استخراج مفاتيح الـ API للمزودين المدعومين في OpenCode

يوفر هذا الدليل روابط تسجيل الدخول المباشرة وخطوات استخراج المفاتيح البرمجية (`API Key`) لجميع المزودين المعتمدين في النواة والموجّه الذكي (`Sovereign Router`).

---

## 1. مزود NVIDIA NIM (مُوصى به للأداء العالي ونماذج الاستدلال)

> تمنحك NVIDIA عند التسجيل **1,000 نقطة استدلال مجانية** (Inference Credits) تجدد بشكل مستمر لتشغيل نماذج مثل `DeepSeek R1` و `Llama 3.3 70B` و `Qwen 2.5 Coder 32B` بسرعة فائقة على كروت DGX Cloud.

- **رابط تسجيل الدخول المباشر:** https://build.nvidia.com/
- **رابط استخراج المفتاح المباشر:** https://org.ngc.nvidia.com/setup/api-key أو من صفحة النموذج مباشرة.
- **خطوات الاستخراج:**
  1. ادخل إلى الرابط أعلاه وسجل دخولك بحساب NVIDIA (أو أنشئ حساباً مجانياً عبر البريد أو Google).
  2. اضغط على أيقونة حسابك في الزاوية العلوية اليمنى واختر **API Keys** أو توجه لأي نموذج مثل `DeepSeek R1`.
  3. اضغط على زر **Get API Key** ثم **Generate Key**.
  4. انسخ المفتاح الذي يبدأ بـ `nvapi-...`.
  5. الصقه في نافذة مفاتيح OpenCode واختر مزود `NVIDIA NIM`.

---

## 2. مزود Groq LPU (فائق السرعة - Ultra-fast Inference)

> يوفر Groq أسرع استدلال في العالم بفضل رقاقات LPU المخصصة، ويوفر **خطة مجانية كريمة جداً** (Free Tier) تكفي لآلاف الطلبات يومياً دون الحاجة لبطاقة بنكية.

- **رابط تسجيل الدخول المباشر:** https://console.groq.com/login
- **رابط استخراج المفتاح المباشر:** https://console.groq.com/keys
- **خطوات الاستخراج:**
  1. افتح رابط Groq Console وسجل الدخول باستخدام GitHub أو Google.
  2. من القائمة الجانبية، اضغط على **API Keys**.
  3. اضغط على زر **Create API Key**.
  4. اكتب أي اسم للمفتاح (مثل `OpenCode Desktop`) ثم اضغط **Submit**.
  5. انسخ المفتاح الذي يبدأ بـ `gsk_...` واحفظه مباشرة.

---

## 3. مزود Cloudflare Workers AI (استدلال سحابي عالمي)

> تقدم Cloudflare وصولاً مجانياً يومياً لخدمة Workers AI (حوالي 10,000 توكن مجاناً يومياً لكل حساب مجاني) عبر شبكة الحافة العالمية.

- **رابط تسجيل الدخول المباشر:** https://dash.cloudflare.com/
- **رابط استخراج رمز الـ API المباشر:** https://dash.cloudflare.com/profile/api-tokens
- **خطوات الاستخراج:**
  1. سجل دخولك إلى لوحة تحكم Cloudflare.
  2. اذهب إلى **My Profile** -> **API Tokens**.
  3. اضغط على **Create Token**.
  4. اختر قالب **Workers AI (Read/Write)** أو أنشئ Custom Token بصلاحية `Account -> Workers AI -> Edit`.
  5. انسخ الرمز المولد واحفظ معه الـ **Account ID** الموجود في لوحة تحكم حسابك.

---

## 4. مزود DeepSeek (المنصة الأصلية)

- **رابط استخراج المفتاح المباشر:** https://platform.deepseek.com/api_keys
- **خطوات الاستخراج:**
  1. سجل الدخول برقم الهاتف أو البريد الإلكتروني.
  2. انتقل إلى تبويب **API Keys** في القائمة الجانبية.
  3. اضغط **Create API Key**.
  4. انسخ المفتاح الذي يبدأ بـ `sk-...`.

---

## 5. مزود OpenAI (نماذج GPT-4o و o3-mini)

- **رابط استخراج المفتاح المباشر:** https://platform.openai.com/api-keys
- **خطوات الاستخراج:**
  1. سجل دخولك إلى منصة OpenAI للمطورين.
  2. اضغط على **Dashboard** -> **API Keys**.
  3. اضغط على **Create new secret key** وحدد الصلاحيات المطلوبة.
  4. انسخ المفتاح `sk-proj-...`.

---

## 6. مزود Anthropic (نماذج Claude 3.7 و Claude 3.5)

- **رابط استخراج المفتاح المباشر:** https://console.anthropic.com/settings/keys
- **خطوات الاستخراج:**
  1. سجل دخولك إلى Anthropic Console.
  2. اذهب إلى **Settings** -> **API Keys**.
  3. اضغط على **Create Key** وانسخ المفتاح الذي يبدأ بـ `sk-ant-...`.

---

## 7. مفتاح OpenCode Zen (البروكسي الشامل)

- **رابط الحصول على المفتاح:** https://opencode.ai/zen
- **الميزة:** مفتاح واحد موحد يتيح الوصول لجميع النماذج دون الحاجة لإنشاء حسابات في كل مزود على حدة.

---

## جدول ملخص الروابط السريعة

| المزود | نوع الرصيد المجاني | الرابط المباشر للمفتاح | صيغة المفتاح |
| :--- | :--- | :--- | :--- |
| **NVIDIA NIM** | 1,000 نقطة مجانية تتجدد | https://build.nvidia.com/ | `nvapi-...` |
| **Groq LPU** | خطة مجانية كريمة جداً | https://console.groq.com/keys | `gsk_...` |
| **Cloudflare** | حصة مجانية يومية | https://dash.cloudflare.com/profile/api-tokens | `Bearer Token` |
| **DeepSeek** | أسعار منخفضة جداً | https://platform.deepseek.com/api_keys | `sk-...` |
| **OpenAI** | مدفوع / رصيد تجريبي | https://platform.openai.com/api-keys | `sk-proj-...` |
| **Anthropic** | مدفوع / رصيد تجريبي | https://console.anthropic.com/settings/keys | `sk-ant-...` |
| **OpenCode Zen** | مدعوم في التطبيق | https://opencode.ai/zen | `zen_...` |
