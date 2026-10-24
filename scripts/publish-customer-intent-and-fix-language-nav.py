#!/usr/bin/env python3
"""Publish original high-intent client articles in TR/EN/AR and normalize blog language navigation."""
from pathlib import Path
from html import escape, unescape
from html.parser import HTMLParser
from datetime import date
import json, math, re, subprocess
import xml.etree.ElementTree as ET

ROOT = Path.cwd()
TODAY = date.today().isoformat()
LANGS = ("tr", "en", "ar")
PAGE_SIZE = {"tr": 15, "en": 24, "ar": 15}
BLOG_LABEL = {"tr": "Dijital Blog", "en": "The Digital Blog", "ar": "المدونة الرقمية"}
READ_LABEL = {"tr": "Rehberi oku", "en": "Read the guide", "ar": "اقرأ الدليل"}
CTA_TITLE = {"tr": "Bu çözümü işletmenize uyarlayalım", "en": "Adapt this approach to your business", "ar": "لنكيّف هذا الحل مع نشاطك التجاري"}
CTA_BODY = {
 "tr": "Hedef kitlenizi, teklifinizi ve mevcut dijital yolculuğunuzu birlikte değerlendirerek uygulanabilir bir yol haritası belirleyelim.",
 "en": "Review your audience, offer and current digital journey to define a practical, prioritised plan.",
 "ar": "لنراجع جمهورك وعرضك ورحلة العميل الرقمية الحالية لوضع خطة عملية واضحة الأولويات."
}
CTA_LINK = {"tr": "/languages/tr.html#contact", "en": "/#contact", "ar": "/languages/ar.html#contact"}
CTA_LABEL = {"tr": "Projenizi konuşalım", "en": "Discuss your project", "ar": "ناقش مشروعك معنا"}

ARTICLES = [
 {"lang":"tr","slug":"premium-web-tasarim-ajansi-nasil-secilir","title":"Premium Web Tasarım Ajansı Nasıl Seçilir? Bütçeyi Değere Dönüştürme Rehberi","description":"Premium web tasarım ajansı seçerken portföy, strateji, dönüşüm, teknik kalite ve proje yönetimini nasıl değerlendireceğinizi öğrenin.","keywords":["premium web tasarım ajansı","kurumsal web tasarım fiyatı","web tasarım ajansı seçimi","yüksek kaliteli web sitesi"],"intro":"Premium bir web sitesi yalnızca estetik bir vitrin değildir. Satın alma kararını kolaylaştırmalı, markanın güvenilirliğini göstermeli ve satış ekibinin doğru müşterilerle görüşmesini desteklemelidir. Ajans seçerken tasarım örneklerinin yanında strateji, ölçüm ve teslimat disiplinini de değerlendirmek gerekir.","sections":[["Portföyü sektör benzerliğiyle değil, çözüm kalitesiyle değerlendirin","Portföyde yalnızca görsel beğeniye bakmayın. Ajansın karmaşık hizmetleri anlaşılır anlatıp anlatmadığını, mobil deneyimi nasıl kurduğunu ve ziyaretçiyi hangi sonraki adıma yönlendirdiğini inceleyin. Benzer bir sektörde çalışma deneyimi faydalıdır; ancak asıl ölçüt, iş hedefini tasarım kararlarına çevirebilmesidir."],["Teklifleri aynı kapsam üzerinden karşılaştırın","Teklifte strateji, içerik, UX, tasarım, geliştirme, teknik SEO, analitik kurulum, test ve bakımın hangilerinin bulunduğunu netleştirin. Yalnızca toplam fiyatı karşılaştırmak, sonradan ortaya çıkan kapsam dışı maliyetleri görünmez kılar. Teslimatlar, revizyon sınırları, sorumlular ve kabul kriterleri yazılı olmalıdır."],["Güven ve dönüşüm için gerekenleri baştan tanımlayın","Hedef müşteri, temel itirazlar, kanıtlanabilir uzmanlık, referansların izinli kullanımı, açık hizmet kapsamı ve kolay iletişim yolu birlikte planlanmalıdır. Hız, erişilebilirlik, güvenlik, mobil kullanım ve ölçümleme son aşamaya bırakılmamalıdır."],["Kararı bir yol haritasıyla verin","İyi ajans, yalnızca bir tasarım dosyası teslim etmez; lansman sonrası ölçülecek göstergeleri ve iyileştirme planını da açıklar. Teklifleri hedefler, kapsam, ekip, süreç, riskler ve destek modeli üzerinden puanlayın. Böylece karar, kişisel zevkten çok iş gereksinimlerine dayanır."]],"faq":[["Premium web tasarımın maliyeti neden değişir?","Kapsam, içerik üretimi, entegrasyonlar, özel işlevler, araştırma ve lansman sonrası destek maliyeti etkiler. Sağlıklı karşılaştırma için teslimatları ve hariç tutulan işleri yazılı olarak isteyin."],["Ajans seçerken en önemli soru nedir?","Ajansın tasarım kararlarını hedef kitle, iş hedefi ve ölçülebilir kullanıcı davranışıyla nasıl ilişkilendirdiğini sorun."],["Web sitesi yayına girdikten sonra iş biter mi?","Hayır. Analitik veriler, kullanıcı geri bildirimi, güvenlik güncellemeleri ve dönüşüm testleri düzenli iyileştirme gerektirir."]]},
 {"lang":"tr","slug":"premium-hizmetler-icin-nitelikli-musteri-talebi","title":"Premium Hizmetler İçin Nitelikli Müşteri Nasıl Bulunur? Dijital Talep Rehberi","description":"Yüksek değerli hizmetlerde daha fazla değil, daha uygun müşteri adayı kazanmak için SEO, içerik, reklam ve dönüşüm sürecini planlayın.","keywords":["nitelikli müşteri bulma","premium hizmet pazarlaması","yüksek bütçeli müşteri kazanma","nitelikli lead oluşturma"],"intro":"Premium hizmetlerde başarı yalnızca form sayısıyla ölçülmez. Gerçek ihtiyacı, uygun bütçesi, karar yetkisi ve doğru zamanlaması olan müşteri adayları daha değerlidir. Bunun için reklam, içerik ve web sitesi aynı müşteri yolculuğuna hizmet etmelidir.","sections":[["Önce ideal müşteriyi ve uygun olmayan talepleri tanımlayın","En iyi müşterilerin hangi sorunu çözmek istediğini, hangi sonucu beklediğini, karar sürecinde kimlerin bulunduğunu ve hangi itirazları dile getirdiğini belirleyin. Hizmetin kimler için uygun olmadığını da açıkça tanımlamak, yanlış talepleri azaltır ve iletişimi netleştirir."],["Arama niyetine göre içerik ve açılış sayfası oluşturun","Kullanıcılar yalnızca hizmet adını değil; maliyet, süreç, güven, karşılaştırma, risk ve beklenen sonuçları da arar. Her sayfa tek bir niyete odaklanmalı; kapsamı, çalışma yöntemini, teslimatları, sık soruları ve mantıklı bir sonraki adımı açıklamalıdır. Genel bir ana sayfaya tüm reklam trafiğini göndermek çoğu zaman mesaj uyumunu zayıflatır."],["Reklamı yalnızca tıklamaya göre optimize etmeyin","Form gönderiminden sonra lead kalitesini CRM'de takip edin. Uygun görüşme, teklif, kazanılan müşteri ve gelir gibi aşamaları reklam kaynağıyla ilişkilendirin. Bütçeyi yalnızca düşük maliyetli formlara değil, iş hedefiyle uyumlu nitelikli taleplere göre değerlendirin."],["Satış geri bildirimini pazarlamaya geri taşıyın","Satış ekibinin neden kazanılan veya kaybedilen görüşmeleri düzenli olarak sınıflandırmasını sağlayın. Bu bilgiler yeni içerik konularını, form sorularını, teklif açıklamalarını ve reklam hedeflemesini iyileştirir. Küçük ama düzenli testler, tek seferlik büyük değişikliklerden daha sağlıklı öğrenme sağlar."]],"faq":[["Nitelikli müşteri adayı ne demektir?","İhtiyacı, hizmetle uyumu, karar süreci ve ticari koşulları işletmenin hedefleriyle makul ölçüde örtüşen adaydır. Tanım sektöre göre belirlenmelidir."],["Premium hizmetlerde fiyatı web sitesinde göstermek gerekir mi?","Bu, satış modeline bağlıdır. Sabit paketlerde fiyat açıklığı faydalı olabilir; kapsamı değişen projelerde başlangıç aralığı veya teklif sürecinin nasıl işlediği anlatılabilir."],["SEO mu reklam mı önce yapılmalı?","Zamanlama, mevcut talep ve bütçeye bağlıdır. Reklam daha hızlı test imkânı sunabilir; SEO ise sürdürülebilir arama görünürlüğü oluşturur. Çoğu işletme için ölçümlü bir birleşim daha anlamlıdır."]]},
 {"lang":"tr","slug":"uluslararasi-musteriler-icin-web-sitesi-ve-seo","title":"Uluslararası Müşteri Kazanmak İçin Web Sitesi ve SEO Nasıl Hazırlanır?","description":"Türkiye dışındaki müşterilere ulaşmak isteyen işletmeler için dil, yerelleştirme, güven unsurları ve uluslararası SEO yol haritası.","keywords":["uluslararası müşteri kazanma","uluslararası SEO","çok dilli web sitesi","yurt dışına dijital pazarlama"],"intro":"Yurt dışından müşteri kazanmak, mevcut web sitesini yalnızca başka dillere çevirmekten ibaret değildir. Her pazarın arama alışkanlıkları, güven beklentileri, karar süreci ve hizmete ilişkin soruları farklı olabilir. Sağlam bir uluslararası yapı, bu farkları planlı biçimde ele alır.","sections":[["Pazar ve arama niyetini ülke bazında doğrulayın","Önce hangi ülkelerde hizmet verebildiğinizi, hangi müşteri segmentlerinin uygun olduğunu ve satın alma sürecini belirleyin. Anahtar kelimeleri kelime kelime çevirmek yerine yerel arama ifadelerini, ticari niyeti ve rakip sayfaları inceleyin."],["Her dil için gerçekten yerelleştirilmiş sayfalar hazırlayın","Hizmet kapsamı, teslimat biçimi, iletişim saatleri, para birimi, örnek süreç ve sık sorulan sorular hedef pazara uygun olmalıdır. Otomatik çeviriyle aynı metni çoğaltmak yerine her dilde doğal anlatım ve özgün değer önerisi oluşturun."],["Teknik uluslararası SEO'yu doğru kurun","Dil klasörleri veya uygun URL yapısı, canonical etiketleri, hreflang eşleşmeleri, XML sitemap, indekslenebilir sayfalar ve dahili bağlantılar tutarlı olmalıdır. Bir dildeki sayfa başka dilin ana sayfasına yanlış yönlendirilmemeli; dil seçimi kullanıcıyı ilgili dilin içerik alanına götürmelidir."],["Güveni ve talep kalitesini ölçün","Süreci, teslimatları, iletişim yöntemini, gerçek referansları ve gizlilik yaklaşımını açıklayın. Ülke, dil, organik arama, reklam kaynağı, nitelikli görüşme ve kazanılan iş verilerini birlikte değerlendirin. Sonuçları pazar bazında karşılaştırarak yatırım kararını güncelleyin."]],"faq":[["Her ülke için ayrı web sitesi gerekir mi?","Her zaman değil. Çoğu durumda iyi yapılandırılmış dil klasörleri ve pazara özgü içerikler yeterli olabilir. Ayrı alan adı kararı marka, operasyon ve yerel gereksinimlere göre verilir."],["Hreflang etiketi neden önemlidir?","Arama motorlarına sayfaların dil ve bölge alternatifleri hakkında sinyal verir. Yanlış veya eksik eşleşmeler, doğru sayfanın doğru kullanıcıya sunulmasını zorlaştırabilir."],["Uluslararası SEO ne kadar sürede sonuç verir?","Rekabet, mevcut otorite, teknik durum ve içerik kalitesine bağlıdır. Başlangıç ölçümleriyle görünürlük, nitelikli trafik ve talep kalitesini düzenli izlemek gerekir."]]},
 {"lang":"en","slug":"how-to-choose-premium-web-design-agency","title":"How to Choose a Premium Web Design Agency: A Practical Buyer’s Checklist","description":"Compare premium web design agencies by strategy, UX, technical quality, scope and measurable business outcomes—not visuals alone.","keywords":["premium web design agency","high-end website design","web design agency checklist","business website redesign"],"intro":"A premium website should do more than look polished. It should communicate value quickly, reduce uncertainty for serious buyers and make the next step clear. Choosing an agency therefore requires evaluating its thinking, delivery process and measurement plan as carefully as its visual portfolio.","sections":[["Evaluate the work behind the visuals","Look for evidence that the agency can explain complex services clearly, create a coherent mobile experience and guide visitors toward a relevant action. Industry familiarity helps, but the stronger signal is the ability to translate business goals and audience needs into design decisions."],["Compare proposals on a like-for-like scope","Check whether research, messaging, UX, design, development, technical SEO, analytics, testing, accessibility and post-launch support are included. Ask for deliverables, responsibilities, revision limits, dependencies and acceptance criteria in writing. A low headline price is not comparable if essential work is excluded."],["Define trust and conversion requirements early","Identify buyer concerns, proof points that can legitimately be used, service boundaries, response expectations and the information needed before a prospect contacts you. Performance, security, mobile usability and analytics should be part of the brief rather than last-minute additions."],["Choose a partner with a post-launch plan","Ask how success will be measured and what happens after launch. A useful plan names the baseline, key conversion events, review cadence and priorities for improvement. Score agencies against business fit, scope clarity, team, process, risk management and support—not personal taste alone."]],"faq":[["Why do premium website proposals vary so much?","Research depth, content, integrations, custom functionality, stakeholder complexity and ongoing support all affect effort. Compare itemised deliverables and exclusions before comparing totals."],["What should I ask an agency first?","Ask how its design decisions connect to your audience, business goals and measurable user behaviour."],["Is launch the end of the project?","No. Analytics, user feedback, security updates and conversion testing should inform ongoing improvements."]]},
 {"lang":"en","slug":"qualified-leads-for-high-ticket-services","title":"How to Generate Qualified Leads for High-Ticket Services Without Chasing More Clicks","description":"Build a lead-generation system for premium services using intent-led SEO, focused landing pages, CRM feedback and quality-based ad measurement.","keywords":["qualified leads for high-ticket services","premium service lead generation","high value client acquisition","lead quality marketing"],"intro":"For high-value services, more form submissions do not automatically mean more business. The goal is to attract people with a relevant problem, realistic expectations and a credible path to a buying decision. Your website, content, paid campaigns and sales follow-up should work as one system.","sections":[["Define fit before buying traffic","Describe the problems your best clients bring, the outcomes they value, their decision process and the constraints that make a project unsuitable. Use this definition to shape messaging and qualification—not to make unsupported assumptions about a person’s wealth or status."],["Match pages to the question the buyer is asking","Prospects search for process, cost drivers, risks, comparisons, proof and expected deliverables—not just service names. Give each landing page a clear intent, specific scope, useful answers and one appropriate next step. Sending every campaign to a generic homepage often weakens message match."],["Optimise campaigns for lead quality, not cheap forms","Connect form submissions to CRM stages such as qualified conversation, proposal, won business and revenue where consent and systems allow. Review results by source and campaign. A more expensive enquiry can be more valuable if it consistently progresses toward a suitable engagement."],["Feed sales insights back into marketing","Record common objections, reasons for lost deals and questions raised by serious prospects. Use those patterns to improve page content, forms, offers and targeting. Run small, measurable tests and retain changes that improve qualified outcomes rather than surface-level activity."]],"faq":[["What makes a lead qualified?","A lead has a relevant need, a plausible fit with the service, an understood decision process and commercial conditions that align with the business. Define the criteria for your own sales model."],["Should premium services publish prices?","It depends on the offer. Fixed packages benefit from transparent pricing; bespoke work can explain cost drivers, minimum scope or how a proposal is developed."],["Should I start with SEO or paid search?","Paid search can test demand quickly while SEO builds discoverability over time. The right mix depends on urgency, budget, competition and the quality of existing conversion data."]]},
 {"lang":"en","slug":"international-seo-for-premium-brands","title":"International SEO for Premium Brands: Turn Global Visibility into Relevant Enquiries","description":"Plan multilingual SEO around real local search intent, market-specific pages, hreflang, trust signals and qualified enquiry measurement.","keywords":["international SEO for premium brands","multilingual website SEO","international customer acquisition","hreflang implementation"],"intro":"International growth is not achieved by translating a homepage and hoping it ranks everywhere. Buyers in different markets use different language, ask different questions and need different reassurance before contacting a provider. A useful international SEO plan treats each market as a customer journey, not just a translation task.","sections":[["Validate markets and local search intent","Start with the countries you can actually serve, the segments that fit your offer and the questions that influence buying decisions. Research local queries and competitors instead of translating keyword lists literally. Prioritise markets where service delivery and commercial fit are realistic."],["Localise the decision-making experience","Adapt service scope, delivery process, contact options, time-zone expectations, proof points and FAQs to the market. Keep language natural and useful. Repeating the same generic copy across country pages creates little value and can undermine trust."],["Make the technical language structure consistent","Choose a maintainable URL structure, then align canonical tags, hreflang alternates, XML sitemap entries and internal links. Each page should be indexable and should point to the correct language version. Language selectors should lead to the relevant language blog or page area—not unexpectedly to a general homepage."],["Measure qualified demand by market","Track search visibility, relevant visits, meaningful enquiries and sales progression by language and country. Use authentic references and clearly describe what your team can deliver. Review performance regularly and invest in markets that show both demand and operational fit."]],"faq":[["Do I need a separate domain for every country?","Not always. Language folders on one domain can be effective when the structure, content and signals are consistent. Separate domains add operational overhead and should serve a clear business reason."],["What does hreflang do?","It helps search engines understand language and regional alternatives. Incorrect reciprocal references or mismatched canonicals can make those signals less useful."],["How long does international SEO take?","Timing depends on competition, site history, technical health and content quality. Measure progress through relevant visibility and qualified demand rather than rankings alone."]]},
 {"lang":"ar","slug":"ikhtiyar-sharikat-tasmim-mawaqi-fakhira","title":"كيف تختار شركة تصميم مواقع فاخرة تناسب أهداف أعمالك؟","description":"معايير عملية لمقارنة شركات تصميم المواقع: الاستراتيجية وتجربة المستخدم والجودة التقنية ونطاق العمل وقياس النتائج.","keywords":["شركة تصميم مواقع فاخرة","تصميم موقع احترافي للشركات","اختيار شركة تصميم مواقع","تطوير موقع أعمال"],"intro":"الموقع الفاخر ليس مجرد واجهة جميلة؛ بل يجب أن يوضح قيمة الخدمة، ويجيب عن أسئلة العميل الجاد، ويسهّل اتخاذ الخطوة التالية. لذلك ينبغي تقييم شركة التصميم من خلال طريقة تفكيرها وجودة التنفيذ وخطة القياس، لا من خلال الصور وحدها.","sections":[["قيّم الحل وراء المظهر","ابحث عن قدرة الشركة على شرح الخدمات المعقدة بوضوح، وبناء تجربة مناسبة للهاتف، وتوجيه الزائر إلى إجراء منطقي. الخبرة في القطاع مفيدة، لكن الأهم هو تحويل أهداف العمل واحتياجات الجمهور إلى قرارات تصميم واضحة."],["قارن العروض على نطاق عمل متكافئ","تحقق مما إذا كان العرض يشمل البحث وصياغة الرسائل وتجربة المستخدم والتصميم والتطوير وتهيئة محركات البحث والتحليلات والاختبارات والدعم بعد الإطلاق. اطلب توضيح المخرجات والمسؤوليات وعدد التعديلات والاستثناءات كتابةً."],["حدّد عناصر الثقة والتحويل مبكراً","وضّح الأسئلة التي يحتاج العميل إلى إجابات عنها، والأدلة التي يمكن استخدامها بمصداقية، وحدود الخدمة وطريقة التواصل. يجب إدراج الأداء والأمان وتجربة الهاتف والتحليلات في الخطة من البداية."],["اختر شريكاً لديه خطة لما بعد الإطلاق","اسأل عن مؤشرات النجاح وكيف ستُراجع النتائج بعد نشر الموقع. الخطة الجيدة تحدد خط الأساس وأحداث التحويل ودورية المراجعة وأولويات التحسين. قارن الشركات وفق ملاءمة الأعمال ووضوح النطاق والفريق وإدارة المخاطر والدعم."]],"faq":[["لماذا تختلف أسعار تصميم المواقع كثيراً؟","تؤثر الأبحاث والمحتوى والتكاملات والوظائف المخصصة وتعقيد المشروع والدعم المستمر في التكلفة. قارن المخرجات والاستثناءات قبل مقارنة السعر الإجمالي."],["ما السؤال الأهم عند اختيار الشركة؟","اسأل كيف ترتبط قرارات التصميم بجمهورك وأهداف العمل وسلوك المستخدم الذي يمكن قياسه."],["هل ينتهي العمل بعد إطلاق الموقع؟","لا. ينبغي استخدام التحليلات وملاحظات المستخدمين وتحديثات الأمان واختبارات التحويل لتحسين الموقع باستمرار."]]},
 {"lang":"ar","slug":"jadhb-umala-mumtazeen-online","title":"كيف تجذب عملاء مناسبين للخدمات المتميزة عبر الإنترنت؟","description":"خطة عملية لجذب طلبات جادة للخدمات عالية القيمة عبر محتوى يطابق نية البحث وصفحات واضحة وقياس جودة العملاء المحتملين.","keywords":["جذب عملاء للخدمات المتميزة","عملاء محتملون مؤهلون","التسويق للخدمات الفاخرة","زيادة طلبات العملاء"],"intro":"في الخدمات مرتفعة القيمة، لا تعني كثرة النماذج المرسلة بالضرورة زيادة المبيعات. الأهم هو الوصول إلى أشخاص لديهم حاجة مناسبة وتوقعات واضحة ومسار واقعي لاتخاذ القرار. لذلك يجب أن يعمل الموقع والمحتوى والإعلانات والمتابعة البيعية كنظام واحد.","sections":[["عرّف العميل المناسب قبل شراء الزيارات","حدّد المشكلات التي يحلها أفضل عملائك والنتائج التي يقدّرونها والأسئلة التي تؤثر في قرارهم. وضّح أيضاً الحالات التي لا تناسب خدمتك. تساعد هذه المعايير على تحسين الرسائل وتأهيل الطلبات دون إطلاق افتراضات غير مثبتة عن ثروة الأشخاص أو مكانتهم."],["أنشئ صفحات تجيب عن أسئلة الشراء","يبحث العملاء عن خطوات العمل وعوامل التكلفة والمخاطر والمقارنة والمخرجات، وليس عن اسم الخدمة فقط. اجعل لكل صفحة هدفاً واضحاً ونطاقاً محدداً وإجابات مفيدة وخطوة تالية مناسبة. توجيه كل الإعلانات إلى صفحة عامة قد يضعف الصلة بين الإعلان واحتياج الباحث."],["قِس جودة الطلبات وليس تكلفة النموذج فقط","اربط الطلبات بمراحل مثل محادثة مؤهلة وعرض سعر وفرصة ناجحة وإيراد، متى توفرت الأنظمة والموافقات اللازمة. راجع الأداء بحسب المصدر والحملة؛ فقد تكون تكلفة الطلب الأعلى مبررة إذا كان أكثر ملاءمة للخدمة ويتقدم في مسار البيع."],["حوّل ملاحظات فريق المبيعات إلى تحسينات","سجّل الاعتراضات المتكررة وأسباب خسارة الفرص والأسئلة التي يطرحها العملاء الجادون. استخدمها لتحسين صفحات الخدمة والنماذج والعروض والاستهداف. اختبر تغييرات صغيرة قابلة للقياس واحتفظ بما يحسّن جودة الفرص فعلاً."]],"faq":[["ما المقصود بالعميل المحتمل المؤهل؟","هو شخص لديه حاجة مناسبة وملاءمة مع الخدمة ومسار قرار مفهوم وظروف تجارية تتوافق مع طبيعة العمل. يجب تحديد المعايير وفق نموذج البيع الخاص بك."],["هل ينبغي عرض الأسعار للخدمات المتميزة؟","يعتمد ذلك على طبيعة العرض. تفيد الشفافية في الباقات الثابتة، بينما يمكن للخدمات المخصصة توضيح عوامل التكلفة أو نطاق البداية أو آلية إعداد العرض."],["هل أبدأ بتحسين محركات البحث أم بالإعلانات؟","قد تساعد الإعلانات في اختبار الطلب بسرعة، بينما يبني SEO الظهور على المدى الطويل. يعتمد المزيج على الاستعجال والميزانية والمنافسة وجودة بيانات التحويل."]]},
 {"lang":"ar","slug":"seo-dawli-lilsharikat-fakhira","title":"تحسين محركات البحث دولياً للشركات المتميزة: من الظهور إلى طلبات العملاء","description":"خطوات لتوسيع الوصول إلى أسواق جديدة عبر كلمات بحث محلية ومحتوى متعدد اللغات وبنية hreflang وقياس الطلبات المؤهلة.","keywords":["تحسين محركات البحث دولياً","SEO متعدد اللغات","جذب عملاء دوليين","hreflang للمواقع"],"intro":"لا يتحقق النمو الدولي بمجرد ترجمة الصفحة الرئيسية. تختلف لغة البحث والأسئلة وعوامل الثقة من سوق إلى آخر. لذلك ينبغي أن تبدأ استراتيجية SEO الدولية بفهم رحلة العميل في كل سوق، ثم توحيد المحتوى والبنية التقنية والقياس.","sections":[["تحقق من الأسواق ونية البحث المحلية","ابدأ بالأسواق التي تستطيع خدمتها فعلياً وبالشرائح التي تناسب عرضك. ابحث عن عبارات محلية ومنافسين وأسئلة تؤثر في قرار الشراء، بدلاً من ترجمة قائمة كلمات مفتاحية حرفياً. أعط الأولوية للأسواق التي تجمع بين الطلب والقدرة التشغيلية."],["كيّف المحتوى مع طريقة اتخاذ القرار","عدّل نطاق الخدمة وخطوات التسليم ووسائل التواصل والتوقيت والأدلة والأسئلة الشائعة لتناسب السوق. يجب أن تكون اللغة طبيعية وأن تقدم قيمة فعلية؛ تكرار النص العام نفسه في صفحات الدول لا يبني ثقة كافية."],["وحّد البنية التقنية للغات","اختر بنية روابط يمكن صيانتها، ثم راجع canonical وhreflang وملف sitemap والروابط الداخلية. يجب أن تكون كل صفحة قابلة للفهرسة وأن تشير إلى النسخة اللغوية الصحيحة. ينبغي أن ينقل محدد اللغة الزائر إلى مدونة اللغة المختارة، لا إلى الصفحة الرئيسية العامة دون سبب."],["قِس الطلب المناسب حسب السوق","تابع الظهور والزيارات ذات الصلة والطلبات الجادة وتقدم المبيعات بحسب اللغة والبلد. استخدم مراجع حقيقية واشرح ما يمكن لفريقك تقديمه بوضوح. راجع النتائج دورياً ووجّه الموارد إلى الأسواق التي تظهر طلباً وملاءمة فعلية."]],"faq":[["هل أحتاج إلى نطاق مستقل لكل دولة؟","ليس دائماً. يمكن أن تكون مجلدات اللغات على نطاق واحد فعالة إذا كانت البنية والمحتويات والإشارات متسقة. ينبغي أن يكون للنطاقات المستقلة سبب تجاري واضح."],["ما فائدة hreflang؟","يساعد محركات البحث على فهم بدائل اللغة والمنطقة. قد تقل فاعليته إذا كانت الروابط المتبادلة أو إشارات canonical غير متوافقة."],["متى تظهر نتائج SEO الدولية؟","يعتمد الوقت على المنافسة وتاريخ الموقع وسلامته التقنية وجودة المحتوى. راقب الظهور ذي الصلة والطلبات المؤهلة بدلاً من الاعتماد على الترتيب وحده."]]}
]

def esc(s):
    return escape(str(s), quote=True)

def lang_links(lang):
    return {"en":"/blog/en/index.html","tr":"/blog/tr/index.html","ar":"/blog/ar/index.html"}

def remove_tag_container(html, start, tag):
    # Remove the balanced element of a known tag beginning at start.
    token_re = re.compile(r'<(/?)([A-Za-z][\w:-]*)(\s[^<>]*?)?>', re.S)
    depth = 0
    first = True
    for m in token_re.finditer(html, start):
        closing, name, attrs = m.group(1), m.group(2).lower(), m.group(3) or ""
        if name != tag:
            continue
        if closing:
            depth -= 1
            if depth == 0:
                return html[:start] + html[m.end():]
        elif not attrs.rstrip().endswith("/"):
            depth += 1
    return html

def remove_article_language_picker(html):
    marker = 'class="language-picker"'
    idx = html.find(marker)
    if idx < 0:
        return html
    # Prefer the wrapper dedicated to the picker; this preserves the logo and article layout.
    candidates = []
    for m in re.finditer(r'<(div|nav)\b([^>]*)>', html[:idx], re.I|re.S):
        tag, attrs = m.group(1).lower(), m.group(2)
        if re.search(r'\bclass\s*=\s*["\'][^"\']*\bnav-right\b', attrs, re.I):
            candidates.append((m.start(), tag, attrs))
        elif tag == "nav" and re.search(r'\bclass\s*=\s*["\'][^"\']*\bnav\b', attrs, re.I):
            candidates.append((m.start(), tag, attrs))
    if not candidates:
        return html
    start, tag, attrs = candidates[-1]
    # Only remove the wrapper if the language picker occurs before its closing tag.
    changed = remove_tag_container(html, start, tag)
    return changed if changed != html else html

def set_blog_language_routes(html, active_lang):
    routes = { "en": "/blog/en/index.html", "tr": "/blog/tr/index.html", "ar": "/blog/ar/index.html" }
    # Only touch the language-picker menu anchors, not article links or content links.
    spans = list(re.finditer(r'<(?:div|details)\b[^>]*class=["\'][^"\']*language-menu[^"\']*["\'][^>]*>[\s\S]*?</(?:div|details)>', html, re.I))
    if not spans:
        # Most pages wrap the menu in a div, but some templates use details with a nested div.
        spans = list(re.finditer(r'<div\b[^>]*class=["\'][^"\']*language-menu[^"\']*["\'][^>]*>[\s\S]*?</div>', html, re.I))
    for m in reversed(spans):
        block = m.group(0)
        for lang, href in routes.items():
            pattern = re.compile(r'(<a\b[^>]*\bdata-lang=["\']'+lang+r'["\'][^>]*\bhref=["\'])[^"\']*(["\'][^>]*>)', re.I)
            block = pattern.sub(lambda x: x.group(1)+href+x.group(2), block)
            # Also handle href before data-lang.
            pattern2 = re.compile(r'(<a\b(?=[^>]*\bdata-lang=["\']'+lang+r'["\'])[^>]*\bhref=["\'])[^"\']*(["\'][^>]*>)', re.I)
            block = pattern2.sub(lambda x: x.group(1)+href+x.group(2), block)
            # Active state belongs to the current blog language.
            block = re.sub(r'(<a\b[^>]*\bdata-lang=["\']'+lang+r'["\'][^>]*?)\saria-current=["\'][^"\']*["\']', r'\1', block, flags=re.I)
            if lang == active_lang:
                block = re.sub(r'(<a\b[^>]*\bdata-lang=["\']'+lang+r'["\'][^>]*)(>)', r'\1 aria-current="page"\2', block, count=1, flags=re.I)
        html = html[:m.start()] + block + html[m.end():]
    return html

def card(a, index):
    lang=a["lang"]; href=f'/blog/{lang}/articles/{a["slug"]}.html'
    category={"tr":"MÜŞTERİ REHBERİ","en":"CLIENT GUIDE","ar":"دليل العملاء"}[lang]
    return (f'<article class="article-card" data-category="client-intent">'
      f'<div class="article-no">{lang.upper()} / {category}</div><div>'
      f'<h3><a href="{href}">{esc(a["title"])}</a></h3><p>{esc(a["description"])}</p></div>'
      f'<a class="read" href="{href}">{READ_LABEL[lang]}</a></article>')

def article_html(a):
    lang=a["lang"]; rtl=lang=="ar"; slug=a["slug"]
    title=a["title"]; desc=a["description"]; url=f'https://rocketpendigital.com/blog/{lang}/articles/{slug}.html'
    home={"tr":"/languages/tr.html#home","en":"/#home","ar":"/languages/ar.html#home"}[lang]
    content_sections="".join('<section><h2>'+esc(h)+'</h2><p>'+esc(p)+'</p></section>' for h,p in a["sections"])
    faq_html="".join('<div class="faq-item"><h3>'+esc(q)+'</h3><p>'+esc(ans)+'</p></div>' for q,ans in a["faq"])
    graph={"@context":"https://schema.org","@graph":[
      {"@type":"BlogPosting","headline":title,"description":desc,"keywords":", ".join(a["keywords"]),
       "datePublished":TODAY,"dateModified":TODAY,"inLanguage":lang,"mainEntityOfPage":url,
       "author":{"@type":"Organization","name":"RocketPen Digital Studio Editorial Team"},
       "publisher":{"@type":"Organization","name":"RocketPen Digital Studio"}},
      {"@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":ans}} for q,ans in a["faq"]]}
    ]}
    schema=json.dumps(graph,ensure_ascii=False).replace("</","<\\/")
    direction=' dir="rtl"' if rtl else ''
    font='Tahoma,Arial,sans-serif' if rtl else "'DM Sans',Arial,sans-serif"
    crumb={"tr":"Dijital Blog","en":"The Digital Blog","ar":"المدونة الرقمية"}[lang]
    intro_label={"tr":"MÜŞTERİ ODAKLI REHBER","en":"CLIENT-INTENT GUIDE","ar":"دليل يركز على احتياجات العميل"}[lang]
    intro=esc(a["intro"])
    return f'''<!doctype html>
<html lang="{lang}"{direction}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)} | RocketPen Digital Studio</title><meta name="description" content="{esc(desc)}"><meta name="keywords" content="{esc(', '.join(a['keywords']))}"><meta name="robots" content="index,follow">
<link rel="canonical" href="{url}"><link rel="icon" type="image/svg+xml" href="/asset/logo/favicon.svg"><meta property="og:type" content="article"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}"><meta property="og:url" content="{url}"><meta property="article:published_time" content="{TODAY}">
<script type="application/ld+json">{schema}</script><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>:root{{--yellow:#ffeb00;--ink:#07090d;--pad:clamp(22px,5.5vw,88px);--font:{font};--display:'Space Grotesk',Arial,sans-serif}}*{{box-sizing:border-box}}body{{margin:0;background:#f7f7f5;color:#15171d;font-family:var(--font);line-height:1.9;direction:{'rtl' if rtl else 'ltr'};text-align:{'right' if rtl else 'left'}}}.top{{display:flex;align-items:center;justify-content:space-between;padding:16px var(--pad);background:#080a0f;color:white;gap:16px}}.logo{{width:clamp(170px,23vw,230px);max-width:70%;height:auto;object-fit:contain;filter:drop-shadow(0 0 7px #ffffff35)}}main{{padding:clamp(40px,7vw,85px) 22px}}.article{{max-width:850px;margin:auto}}.crumb{{font-size:12px;color:#707580;margin-bottom:24px}}.crumb a{{color:#4c5260}}.tag{{font-size:10px;letter-spacing:1.5px;color:#b50e1d;font-weight:700}}h1{{font:700 clamp(34px,5.8vw,60px)/1.22 var(--display);letter-spacing:-.04em;margin:18px 0}}.standfirst{{font-size:clamp(17px,2vw,21px);color:#4d535d;line-height:1.9}}section{{margin:34px 0}}h2{{font:700 clamp(23px,3.4vw,32px)/1.5 var(--display);margin:0 0 14px}}p{{font-size:16px;line-height:1.95;color:#3d424b}}.faq-item{{padding:14px 0;border-bottom:1px solid #ddd}}.faq-item h3{{font-size:18px}}.cta{{margin-top:48px;background:#080a0f;color:#fff;padding:28px;border-inline-start:4px solid var(--yellow)}}.cta h2,.cta p{{color:#fff}}.cta a{{display:inline-block;background:var(--yellow);color:#080a0f;padding:12px 17px;font-weight:700;text-decoration:none}}footer{{padding:22px var(--pad);background:#080a0f;color:#adb3bd;font-size:12px}}footer a{{color:#fff}}@media(max-width:600px){{.top{{padding:14px 20px}}h1{{font-size:clamp(32px,9vw,46px)}}p{{font-size:15px}}}}</style></head>
<body><header class="top"><a href="{home}" aria-label="RocketPen Digital Studio"><img class="logo" src="/asset/logo/logo-header.png" alt="RocketPen Digital Studio"></a></header>
<main><article class="article"><div class="crumb"><a href="/blog/{lang}/index.html">{crumb}</a> / {intro_label}</div><div class="tag">{intro_label}</div><h1>{esc(title)}</h1><p class="standfirst">{intro}</p><div class="meta"><span>RocketPen Digital Studio</span> · <time datetime="{TODAY}">{TODAY}</time></div>{content_sections}<section class="faq-section"><h2>{"Sıkça Sorulan Sorular" if lang=="tr" else "Frequently Asked Questions" if lang=="en" else "الأسئلة الشائعة"}</h2>{faq_html}</section>
<div class="cta"><h2>{CTA_TITLE[lang]}</h2><p>{CTA_BODY[lang]}</p><a href="{CTA_LINK[lang]}">{CTA_LABEL[lang]}</a></div></article></main>
<footer>© {TODAY[:4]} RocketPen Digital Studio · <a href="/blog/{lang}/index.html">← {crumb}</a></footer></body></html>'''

def extract_meta(html, name):
    m=re.search(r'<meta\s+(?:name|property)=["\']'+re.escape(name)+r'["\']\s+content=["\']([^"\']*)["\']',html,re.I)
    if m: return unescape(m.group(1))
    # Attribute order can vary.
    m=re.search(r'<meta\b(?=[^>]*(?:name|property)=["\']'+re.escape(name)+r'["\'])(?=[^>]*content=["\']([^"\']*)["\'])[^>]*>',html,re.I)
    return unescape(m.group(1)) if m else ""

def collect_articles(lang):
    result=[]
    for path in (ROOT/'blog'/lang/'articles').glob('*.html'):
        html=path.read_text(encoding='utf-8')
        title=extract_meta(html,'og:title')
        if not title:
            m=re.search(r'<title>(.*?)</title>',html,re.I|re.S)
            title=unescape(re.sub(r'\s*\|\s*RocketPen.*$','',m.group(1).strip())) if m else path.stem.replace('-',' ').title()
        desc=extract_meta(html,'description') or extract_meta(html,'og:description')
        if not desc:
            desc=title
        pub=extract_meta(html,'article:published_time')
        if not pub:
            m=re.search(r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})"',html)
            pub=m.group(1) if m else '2026-01-01'
        result.append({"lang":lang,"slug":path.stem,"title":title,"description":desc,"date":pub,"path":path})
    return sorted(result,key=lambda a:(a["date"],a["slug"]),reverse=True)

def pagination(lang,current,total):
    prev={"tr":"Önceki","en":"Previous","ar":"السابق"}[lang]
    nxt={"tr":"Sonraki","en":"Next","ar":"التالي"}[lang]
    label={"tr":"Sayfalama","en":"Blog pagination","ar":"ترقيم صفحات المدونة"}[lang]
    def url(n): return f'/blog/{lang}/index.html' if n==1 else f'/blog/{lang}/page/{n}.html'
    out=[f'<nav class="pagination" aria-label="{label}">']
    if current>1: out.append(f'<a href="{url(current-1)}" rel="prev">{prev}</a>')
    lo=max(1,current-2); hi=min(total,current+2)
    if lo>1: out.extend([f'<a href="{url(1)}">1</a>','<span aria-hidden="true">…</span>'])
    for n in range(lo,hi+1):
        out.append(f'<span class="current" aria-current="page">{n}</span>' if n==current else f'<a href="{url(n)}">{n}</a>')
    if hi<total: out.extend(['<span aria-hidden="true">…</span>',f'<a href="{url(total)}">{total}</a>'])
    if current<total: out.append(f'<a href="{url(current+1)}" rel="next">{nxt}</a>')
    out.append('</nav>')
    return ''.join(out)

def render_listing(template,lang,page,articles,total):
    html=template
    # Use the same branded layout for every page, with the canonical matching its real URL.
    base=f'https://rocketpendigital.com/blog/{lang}/index.html'
    target=f'https://rocketpendigital.com/blog/{lang}/page/{page}.html' if page>1 else base
    html=re.sub(r'<link rel="canonical" href="[^"]*">',f'<link rel="canonical" href="{target}">',html,count=1,flags=re.I)
    html=re.sub(r'<meta property="og:url" content="[^"]*">',f'<meta property="og:url" content="{target}">',html,count=1,flags=re.I)
    if page>1:
        title=re.search(r'<title>(.*?)</title>',html,re.I|re.S)
        if title:
            base_title=unescape(title.group(1))
            suffix={"tr":f" — Sayfa {page}","en":f" — Page {page}","ar":f" — الصفحة {page}"}[lang]
            html=html[:title.start()]+f'<title>{esc(base_title.replace(" | RocketPen Digital Studio",""))}{suffix} | RocketPen Digital Studio</title>'+html[title.end():]
    cards='\n'.join(card(a,i) for i,a in enumerate(articles))
    start=html.find('<!-- POSTS_START -->'); end=html.find('<!-- POSTS_END -->')
    if start<0 or end<start: raise RuntimeError(f'Article markers missing for {lang} page template')
    html=html[:start+len('<!-- POSTS_START -->')]+ '\n'+cards+'\n'+html[end:]
    pager= pagination(lang,page,total)
    if '<!-- PAGINATION_START -->' in html and '<!-- PAGINATION_END -->' in html:
        s=html.index('<!-- PAGINATION_START -->'); e=html.index('<!-- PAGINATION_END -->')+len('<!-- PAGINATION_END -->')
        html=html[:s]+'<!-- PAGINATION_START -->'+pager+'<!-- PAGINATION_END -->'+html[e:]
    else:
        html=re.sub(r'<nav class="pagination"[^>]*>[\s\S]*?</nav>',pager,html,count=1,flags=re.I)
    html=set_blog_language_routes(html,lang)
    return html

def update_sitemap():
    sitemap=ROOT/'sitemap.xml'
    ET.register_namespace('',"http://www.sitemaps.org/schemas/sitemap/0.9")
    ns="{http://www.sitemaps.org/schemas/sitemap/0.9}"
    root=ET.parse(sitemap).getroot()
    retained=[]
    for node in list(root):
        loc=node.find(ns+'loc')
        url=loc.text if loc is not None else ''
        if not re.search(r'/blog/(?:tr|en|ar)/(?:index\.html|page/\d+\.html|articles/[^/]+\.html)$',url):
            retained.append(node)
    for node in list(root): root.remove(node)
    for node in retained: root.append(node)
    seen={node.find(ns+'loc').text for node in retained if node.find(ns+'loc') is not None}
    for lang in LANGS:
        urls=[f'https://rocketpendigital.com/blog/{lang}/index.html']
        total=math.ceil(len(list((ROOT/'blog'/lang/'articles').glob('*.html')))/PAGE_SIZE[lang])
        urls += [f'https://rocketpendigital.com/blog/{lang}/page/{n}.html' for n in range(2,total+1)]
        urls += [f'https://rocketpendigital.com/blog/{lang}/articles/{p.stem}.html' for p in sorted((ROOT/'blog'/lang/'articles').glob('*.html'))]
        for url in urls:
            if url in seen: continue
            node=ET.SubElement(root,ns+'url')
            ET.SubElement(node,ns+'loc').text=url
            ET.SubElement(node,ns+'lastmod').text=TODAY
            seen.add(url)
    sitemap.write_bytes(ET.tostring(root,encoding='utf-8',xml_declaration=True))

def main():
    added=[]
    for a in ARTICLES:
        path=ROOT/'blog'/a['lang']/'articles'/(a['slug']+'.html')
        if path.exists():
            raise RuntimeError('Refusing to overwrite existing article: '+str(path))
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(article_html(a),encoding='utf-8')
        added.append(a)
    # Remove article-header language pickers and make blog-page language choices point to language-specific blogs.
    article_counts={}
    for lang in LANGS:
        article_dir=ROOT/'blog'/lang/'articles'
        changed=0
        for path in article_dir.glob('*.html'):
            old=path.read_text(encoding='utf-8')
            new=remove_article_language_picker(old)
            if new!=old:
                path.write_text(new,encoding='utf-8'); changed+=1
        article_counts[lang]=len(list(article_dir.glob('*.html')))
        print(f'{lang}: removed article language picker from {changed} pages; total articles={article_counts[lang]}')
    for lang in LANGS:
        index_path=ROOT/'blog'/lang/'index.html'
        index_template=index_path.read_text(encoding='utf-8')
        index_template=set_blog_language_routes(index_template,lang)
        index_path.write_text(index_template,encoding='utf-8')
        all_articles=collect_articles(lang)
        size=PAGE_SIZE[lang]
        total=max(1,math.ceil(len(all_articles)/size))
        for page in range(1,total+1):
            template=index_template
            page_path=index_path if page==1 else ROOT/'blog'/lang/'page'/f'{page}.html'
            page_path.parent.mkdir(parents=True,exist_ok=True)
            subset=all_articles[(page-1)*size:page*size]
            rendered=render_listing(template,lang,page,subset,total)
            page_path.write_text(rendered,encoding='utf-8')
        # Remove stale archive pages only if they exceed the newly computed total.
        for stale in (ROOT/'blog'/lang/'page').glob('*.html') if (ROOT/'blog'/lang/'page').exists() else []:
            m=re.fullmatch(r'(\d+)\.html',stale.name)
            if m and int(m.group(1))>total: stale.unlink()
        print(f'{lang}: rebuilt {total} archive pages, {len(all_articles)} article URLs')
    update_sitemap()
    print('New customer-intent articles:', ', '.join(f'{a["lang"]}:{a["slug"]}' for a in added))
    print('Updated sitemap and language navigation.')

if __name__=='__main__':
    main()
