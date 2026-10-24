import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const API_KEY = process.env.OPENAI_API_KEY;
const SITE_URL = (process.env.SITE_URL || 'https://rocketpendigital.com').trim().replace(/\/+$/, '');
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const TODAY = new Date().toISOString().slice(0, 10);
const DAY = Math.floor(Date.now() / 86400000);
const LANGS = ['en', 'tr', 'ar'];
const CATS = ['brand-strategy', 'web-seo', 'creative-video', 'social-content', 'digital-growth', 'industry-guides'];
const CAT = {
 en: {'brand-strategy':'Brand strategy','web-seo':'Websites & SEO','creative-video':'Creative & video','social-content':'Social media & content','digital-growth':'Digital growth','industry-guides':'Industry guides'},
 tr: {'brand-strategy':'Marka stratejisi','web-seo':'Web siteleri ve SEO','creative-video':'Yaratıcı içerik ve video','social-content':'Sosyal medya ve içerik','digital-growth':'Dijital büyüme','industry-guides':'Sektör rehberleri'},
 ar: {'brand-strategy':'استراتيجية العلامة','web-seo':'المواقع وSEO','creative-video':'الإبداع والفيديو','social-content':'التواصل والمحتوى','digital-growth':'النمو الرقمي','industry-guides':'أدلة القطاعات'}
};
const L = {
 en:{name:'English',direction:'ltr',region:'United States, United Kingdom and international English-speaking markets',home:'/index.html',blog:'/blog/en/index.html',read:'min read',homeLabel:'Home',blogLabel:'Digital Blog',contact:'Discuss your project',faq:'Frequently asked questions',sources:'Sources and further reading',cta:'Tell us what you are building and we will help define the right next step.',answerLabel:'In brief: ',related:'Related guides'},
 tr:{name:'Türkçe',direction:'ltr',region:'Türkiye; use natural Turkish terminology and examples relevant to local service businesses',home:'/languages/tr.html',blog:'/blog/tr/index.html',read:'dk okuma',homeLabel:'Ana sayfa',blogLabel:'Dijital Blog',contact:'Projenizi konuşalım',faq:'Sık sorulan sorular',sources:'Kaynaklar ve ileri okuma',cta:'Ne geliştirmek istediğinizi anlatın; doğru sonraki adımı birlikte netleştirelim.',answerLabel:'Kısaca: ',related:'İlgili rehberler'},
 ar:{name:'العربية',direction:'rtl',region:'United Arab Emirates and Qatar; use clear Modern Standard Arabic and business-relevant Gulf context without assuming the two markets are identical',home:'/languages/ar.html',blog:'/blog/ar/index.html',read:'دقيقة قراءة',homeLabel:'الرئيسية',blogLabel:'المدونة الرقمية',contact:'ناقش مشروعك',faq:'الأسئلة الشائعة',sources:'مصادر إضافية',cta:'أخبرنا بما تخطط لبنائه، وسنساعدك في تحديد الخطوة التالية المناسبة.',answerLabel:'الخلاصة: ',related:'أدلة ذات صلة'}
};
const TOPICS = {
 en:[
  ['premium-website-agency','How to choose a premium website design agency for a high-value business','web-seo','buyer-intent'],
  ['website-not-generating-leads','Why a business website gets visits but few qualified enquiries—and how to fix it','digital-growth','buyer-intent'],
  ['international-client-website','How to build a multilingual website that converts international clients','web-seo','buyer-intent'],
  ['luxury-brand-digital-presence','How luxury and premium brands can create a digital presence that earns trust','brand-strategy','buyer-intent'],
  ['digital-agency-selection','Questions to ask before hiring a digital marketing agency','digital-growth','buyer-intent'],
  ['wasted-ad-spend-audit','What to check when paid ads spend money without bringing qualified leads','digital-growth','buyer-intent'],
  ['real-estate-qualified-leads','How premium real estate firms can attract more qualified property enquiries online','industry-guides','buyer-intent'],
  ['b2b-lead-generation-website','How B2B companies can turn their website into a more reliable lead channel','digital-growth','buyer-intent'],
  ['brand-repositioning-business','When a growing company should invest in brand repositioning and a website refresh','brand-strategy','buyer-intent'],
  ['uae-gulf-digital-agency','How to prepare a digital presence for reaching premium clients in the UAE and Gulf','digital-growth','buyer-intent'],

  ['brand-agency-hiring','How to choose a brand strategy agency for an established company','brand-strategy','buyer-intent'],
  ['website-cost-drivers','What affects the scope and cost of a custom business website','web-seo','buyer-intent'],
  ['website-redesign-timing','How to tell whether a business website needs a redesign','web-seo','buyer-intent'],
  ['service-website-conversion-audit','A practical conversion audit for a service business website','digital-growth','buyer-intent'],
  ['luxury-hotel-website','What a premium hospitality website needs to answer before a guest enquires','industry-guides','buyer-intent'],
  ['private-clinic-website','How private clinics can make their website clearer and more useful to prospective patients','industry-guides','buyer-intent'],
  ['international-seo-provider','How to evaluate international SEO support before expanding abroad','web-seo','buyer-intent'],
  ['arabic-english-website','Planning an Arabic-English website for customers across the Gulf','web-seo','buyer-intent'],
  ['business-website-project-process','What to prepare before commissioning a business website','web-seo','buyer-intent'],
  ['crm-website-integration','When a business website should connect to a CRM and lead workflow','digital-growth','buyer-intent'],
  ['lead-quality-improvement','How to improve lead quality instead of simply increasing enquiry volume','digital-growth','buyer-intent'],
  ['high-value-service-landing-page','How to structure a landing page for a high-consideration service','web-seo','buyer-intent'],
  ['consultancy-website-trust','How consulting firms can explain expertise and build trust online','industry-guides','buyer-intent'],
  ['brand-identity-scope','What a professional brand identity engagement should include','brand-strategy','buyer-intent'],
  ['uae-market-entry-digital','Digital preparation checklist for a company entering the UAE market','digital-growth','buyer-intent'],
  ['premium-ecommerce-conversion','How premium ecommerce brands can reduce purchase uncertainty','industry-guides','buyer-intent'],
  ['b2b-website-redesign','How B2B firms can plan a website redesign around sales questions','web-seo','buyer-intent'],
  ['agency-proposal-review','How to compare digital agency proposals beyond the headline price','digital-growth','buyer-intent'],
  ['seo-consultant-or-agency','When to hire an SEO consultant versus a specialist agency','web-seo','buyer-intent'],
  ['customer-journey-website-audit','How to audit a website from first visit to qualified enquiry','digital-growth','buyer-intent'],
 ['brand-positioning','Brand positioning for growing service businesses','brand-strategy'],
 ['brand-message','Writing a brand message customers understand quickly','brand-strategy'],
 ['visual-identity','Creating a flexible visual identity system','brand-strategy'],
 ['brand-consistency','Keeping brand consistency across digital touchpoints','brand-strategy'],
 ['rebrand-planning','Planning a rebrand without losing customer trust','brand-strategy'],
 ['website-brief','Preparing a useful brief for a website design project','web-seo'],
 ['landing-page','Designing landing pages around a clear customer decision','web-seo'],
 ['technical-seo','A technical SEO checklist for small and midsize businesses','web-seo'],
 ['local-seo','Improving local search visibility for service businesses','web-seo'],
 ['site-architecture','Structuring website pages and internal links around intent','web-seo'],
 ['core-web-vitals','Practical website performance improvements for users','web-seo'],
 ['accessibility','Making business websites easier to use and understand','web-seo'],
 ['case-studies','Turning project work into useful and credible case studies','brand-strategy'],
 ['short-video','Building a repeatable short-form video content system','creative-video'],
 ['product-video','Planning product and service videos around customer questions','creative-video'],
 ['creative-testing','Testing creative concepts without confusing results','creative-video'],
 ['social-calendar','Building a social media calendar around business goals','social-content'],
 ['content-repurposing','Repurposing one strong idea across multiple formats','social-content'],
 ['b2b-content','Planning useful content for B2B decision makers','social-content'],
 ['community-management','Building a consistent and helpful social brand voice','social-content'],
 ['ai-workflow','Using AI in marketing workflows while protecting quality','digital-growth'],
 ['campaign-brief','Writing a campaign brief that connects creative work to results','digital-growth'],
 ['marketing-measurement','Choosing digital marketing metrics that support decisions','digital-growth'],
 ['conversion-review','Running a practical conversion review of a service website','digital-growth'],
 ['lead-funnel','Designing a clear lead journey for professional services','digital-growth'],
 ['ecommerce-trust','Improving trust and product information on ecommerce pages','industry-guides'],
 ['hospitality-brand','Digital brand experience for hospitality businesses','industry-guides'],
 ['real-estate-content','Building useful digital content for real estate businesses','industry-guides'],
 ['clinic-website','Website clarity and responsible communication for clinics','industry-guides'],
 ['professional-services','Explaining complex professional services simply online','industry-guides']
 ],
 tr:[
  ['premium-web-tasarim-ajansi-secimi','Premium web tasarım ajansı nasıl seçilir? İşletmeler için karar rehberi','web-seo','buyer-intent'],
  ['site-var-musteri-yok','Web sitesi ziyaretçi alıyor ama müşteri getirmiyorsa ne yapılmalı?','digital-growth','buyer-intent'],
  ['yabanci-musteri-cok-dilli-site','Yurt dışından müşteri kazanmak için çok dilli web sitesi nasıl planlanır?','web-seo','buyer-intent'],
  ['ust-segment-marka-dijital-guven','Üst segment markalar internette nasıl güven veren bir görünüm oluşturur?','brand-strategy','buyer-intent'],
  ['dijital-ajans-secim-sorulari','Dijital ajans seçmeden önce sorulması gereken sorular','digital-growth','buyer-intent'],
  ['reklam-butcesi-verimsiz','Reklam bütçesi harcanıyor ama nitelikli müşteri gelmiyorsa kontrol listesi','digital-growth','buyer-intent'],
  ['gayrimenkul-nitelikli-talep','Gayrimenkul firmaları internetten nitelikli müşteri taleplerini nasıl artırabilir?','industry-guides','buyer-intent'],
  ['b2b-musteri-adayi-web','B2B işletmeler web sitesinden daha fazla müşteri adayı nasıl kazanabilir?','digital-growth','buyer-intent'],
  ['marka-yenileme-zamani','Bir işletme marka kimliğini ve web sitesini ne zaman yenilemeli?','brand-strategy','buyer-intent'],
  ['dubai-korfez-musteri-kazanimi','Dubai ve Körfez bölgesinden müşteri hedefleyen işletmeler için dijital hazırlık','digital-growth','buyer-intent'],

  ['marka-ajansi-secimi','Marka stratejisi ajansı seçerken nelere dikkat edilmeli?','brand-strategy','buyer-intent'],
  ['kurumsal-site-maliyet-etkenleri','Kurumsal web sitesi projesinin kapsamını ve maliyetini hangi unsurlar belirler?','web-seo','buyer-intent'],
  ['site-yenileme-zamani','Bir işletmenin web sitesini yenilemesi gerektiği nasıl anlaşılır?','web-seo','buyer-intent'],
  ['hizmet-sitesi-donusum-denetimi','Hizmet işletmeleri için web sitesi dönüşüm denetimi nasıl yapılır?','digital-growth','buyer-intent'],
  ['premium-otel-web-sitesi','Premium otel web sitesi ziyaretçinin karar vermesi için neleri açıklamalı?','industry-guides','buyer-intent'],
  ['ozel-klinik-web-sitesi','Özel klinikler web sitelerini hasta adayları için nasıl daha anlaşılır hale getirebilir?','industry-guides','buyer-intent'],
  ['uluslararasi-seo-ajansi','Yurt dışına açılmadan önce uluslararası SEO hizmeti nasıl değerlendirilir?','web-seo','buyer-intent'],
  ['arapca-ingilizce-web-sitesi','Körfez pazarları için Arapça ve İngilizce web sitesi nasıl planlanır?','web-seo','buyer-intent'],
  ['kurumsal-site-proje-sureci','Kurumsal web sitesi yaptırmadan önce hangi hazırlıklar yapılmalı?','web-seo','buyer-intent'],
  ['web-sitesi-crm-entegrasyonu','Web sitesi CRM sistemine ne zaman bağlanmalı?','digital-growth','buyer-intent'],
  ['nitelikli-musteri-adayi','Daha çok form yerine daha nitelikli müşteri adayı nasıl kazanılır?','digital-growth','buyer-intent'],
  ['yuksek-degerli-hizmet-acilis-sayfasi','Karar vermesi uzun süren hizmetler için açılış sayfası nasıl tasarlanır?','web-seo','buyer-intent'],
  ['danismanlik-web-sitesi-guven','Danışmanlık şirketleri uzmanlığını internette nasıl anlaşılır anlatabilir?','industry-guides','buyer-intent'],
  ['marka-kimligi-hizmet-kapsami','Profesyonel marka kimliği çalışmasının kapsamı neleri içermeli?','brand-strategy','buyer-intent'],
  ['bae-pazarina-acilma-dijital','BAE pazarına açılacak işletmeler için dijital hazırlık kontrol listesi','digital-growth','buyer-intent'],
  ['premium-eticaret-satis-engelleri','Premium e-ticaret markaları satın alma tereddütlerini nasıl azaltabilir?','industry-guides','buyer-intent'],
  ['b2b-web-sitesi-yenileme','B2B şirketleri web sitesi yenilemesini satış sorularına göre nasıl planlamalı?','web-seo','buyer-intent'],
  ['ajans-teklif-karsilastirma','Dijital ajans teklifleri yalnızca fiyatına bakılmadan nasıl karşılaştırılır?','digital-growth','buyer-intent'],
  ['seo-uzmani-mi-ajans-mi','SEO uzmanı mı yoksa uzmanlaşmış ajans mı tercih edilmeli?','web-seo','buyer-intent'],
  ['musteri-yolculugu-site-denetimi','İlk ziyaretten nitelikli talebe kadar web sitesi müşteri yolculuğu nasıl denetlenir?','digital-growth','buyer-intent'],
 ['marka-konumlandirma','Büyüyen işletmeler için marka konumlandırma rehberi','brand-strategy'],
 ['marka-mesaji','Müşterinin hızlıca anlayacağı marka mesajı oluşturmak','brand-strategy'],
 ['gorsel-kimlik','Tutarlı ve esnek bir görsel kimlik sistemi kurmak','brand-strategy'],
 ['marka-tutarliligi','Dijital temas noktalarında marka tutarlılığını korumak','brand-strategy'],
 ['yeniden-markalama','Müşteri güvenini koruyarak yeniden markalama planlamak','brand-strategy'],
 ['web-tasarim-briefi','Web sitesi projesi için doğru brief hazırlamak','web-seo'],
 ['landing-page','Müşteri kararına odaklanan açılış sayfası tasarlamak','web-seo'],
 ['teknik-seo','Küçük ve orta ölçekli işletmeler için teknik SEO kontrol listesi','web-seo'],
 ['yerel-seo','Hizmet işletmeleri için yerel arama görünürlüğünü geliştirmek','web-seo'],
 ['site-mimarisi','Web sayfalarını arama niyetine göre düzenlemek','web-seo'],
 ['site-hizi','Kullanıcı deneyimi için web sitesi performansını iyileştirmek','web-seo'],
 ['erisilebilir-web','İşletme web sitesini erişilebilir ve anlaşılır yapmak','web-seo'],
 ['vaka-calismasi','Proje çalışmalarını güven veren vaka incelemelerine dönüştürmek','brand-strategy'],
 ['kisa-video','Sürdürülebilir kısa video içerik sistemi kurmak','creative-video'],
 ['urun-hizmet-videosu','Müşteri sorularını yanıtlayan ürün ve hizmet videoları planlamak','creative-video'],
 ['yaratici-test','Reklam yaratıcılarını sonuçları karıştırmadan test etmek','creative-video'],
 ['sosyal-medya-takvimi','İş hedeflerine bağlı sosyal medya içerik takvimi kurmak','social-content'],
 ['icerik-yeniden-kullanim','Tek bir fikri farklı içerik formatlarına uyarlamak','social-content'],
 ['b2b-icerik','B2B karar vericiler için yararlı içerik planlamak','social-content'],
 ['marka-dili','Sosyal medyada tutarlı ve yardımcı marka dili oluşturmak','social-content'],
 ['yapay-zeka-pazarlama','Pazarlamada yapay zekâ kullanırken kaliteyi korumak','digital-growth'],
 ['kampanya-briefi','Yaratıcı çalışmayı sonuçlarla bağlayan kampanya briefi','digital-growth'],
 ['pazarlama-olcumu','Karar vermeye yardımcı dijital pazarlama metrikleri','digital-growth'],
 ['donusum-analizi','Hizmet web sitesi için dönüşüm analizi yapmak','digital-growth'],
 ['potansiyel-musteri','Profesyonel hizmetler için müşteri adayı yolculuğu','digital-growth'],
 ['eticaret-guveni','E-ticaret sayfalarında güveni ve ürün bilgisini iyileştirmek','industry-guides'],
 ['konaklama-markasi','Konaklama işletmeleri için dijital marka deneyimi','industry-guides'],
 ['gayrimenkul-icerigi','Gayrimenkul işletmeleri için yararlı dijital içerik','industry-guides'],
 ['klinik-web-sitesi','Klinik web sitelerinde açıklık ve etik iletişim','industry-guides'],
 ['profesyonel-hizmet','Karmaşık profesyonel hizmetleri internette sade anlatmak','industry-guides']
 ],
 ar:[
  ['premium-website-agency-gulf','كيف تختار شركة تصميم مواقع احترافية تناسب نشاطك التجاري في الخليج؟','web-seo','buyer-intent'],
  ['website-no-qualified-leads-ar','لماذا يجذب موقع الشركة زيارات دون استفسارات جادة؟ خطوات عملية للتحسين','digital-growth','buyer-intent'],
  ['multilingual-site-international-ar','كيف تبني موقعاً متعدد اللغات يجذب العملاء الدوليين ويخدم احتياجاتهم؟','web-seo','buyer-intent'],
  ['premium-brand-digital-trust-ar','كيف تبني العلامات التجارية الفاخرة حضوراً رقمياً يعزز الثقة؟','brand-strategy','buyer-intent'],
  ['choose-digital-agency-gulf','ما الأسئلة التي ينبغي طرحها قبل التعاقد مع وكالة تسويق رقمي؟','digital-growth','buyer-intent'],
  ['ads-spend-no-leads-gulf','ماذا تفعل عندما تنفق الإعلانات ميزانيتك دون استفسارات مؤهلة؟','digital-growth','buyer-intent'],
  ['luxury-real-estate-leads-gulf','كيف تجذب شركات العقارات الفاخرة استفسارات أكثر جدية عبر الإنترنت؟','industry-guides','buyer-intent'],
  ['b2b-lead-generation-ar','كيف يمكن لشركات الأعمال جذب عملاء محتملين من خلال الموقع الإلكتروني؟','digital-growth','buyer-intent'],
  ['brand-refresh-business-ar','متى تحتاج الشركة إلى تحديث هويتها التجارية وموقعها الإلكتروني؟','brand-strategy','buyer-intent'],
  ['premium-clients-uae-qatar-ar','كيف تستعد الشركات لاستهداف العملاء ذوي القيمة العالية في الإمارات وقطر؟','digital-growth','buyer-intent'],

  ['brand-agency-hiring-ar','كيف تختار وكالة استراتيجية علامة تجارية لشركة قائمة؟','brand-strategy','buyer-intent'],
  ['business-website-cost-ar','ما العوامل التي تحدد نطاق وتكلفة مشروع موقع تجاري مخصص؟','web-seo','buyer-intent'],
  ['website-redesign-timing-ar','كيف تعرف أن موقع شركتك يحتاج إلى إعادة تصميم؟','web-seo','buyer-intent'],
  ['service-site-conversion-audit-ar','كيف تجري مراجعة عملية لتحسين تحويل زوار موقع الخدمات إلى استفسارات؟','digital-growth','buyer-intent'],
  ['premium-hotel-website-ar','ما المعلومات التي يحتاجها الزائر قبل التواصل مع فندق فاخر؟','industry-guides','buyer-intent'],
  ['private-clinic-website-ar','كيف تجعل العيادات الخاصة مواقعها أوضح للمرضى المحتملين؟','industry-guides','buyer-intent'],
  ['international-seo-provider-ar','كيف تقيّم خدمات SEO الدولي قبل التوسع إلى أسواق جديدة؟','web-seo','buyer-intent'],
  ['arabic-english-website-gulf-ar','كيف تخطط لموقع عربي وإنجليزي يخدم عملاء الخليج؟','web-seo','buyer-intent'],
  ['business-website-project-ar','ما الذي ينبغي تجهيزه قبل التعاقد على تصميم موقع شركة؟','web-seo','buyer-intent'],
  ['crm-website-integration-ar','متى ينبغي ربط الموقع الإلكتروني بنظام CRM وإدارة العملاء المحتملين؟','digital-growth','buyer-intent'],
  ['qualified-leads-ar','كيف تحسّن جودة العملاء المحتملين بدلاً من زيادة عدد الاستفسارات فقط؟','digital-growth','buyer-intent'],
  ['high-consideration-service-landing-ar','كيف تصمم صفحة هبوط لخدمة تحتاج إلى دراسة ومقارنة قبل الشراء؟','web-seo','buyer-intent'],
  ['consultancy-website-trust-ar','كيف تعرض شركات الاستشارات خبرتها بوضوح وتبني الثقة عبر الإنترنت؟','industry-guides','buyer-intent'],
  ['brand-identity-scope-ar','ما الذي ينبغي أن تتضمنه خدمة الهوية البصرية الاحترافية؟','brand-strategy','buyer-intent'],
  ['uae-market-entry-digital-ar','قائمة تجهيز الحضور الرقمي للشركات التي تدخل سوق الإمارات','digital-growth','buyer-intent'],
  ['premium-ecommerce-conversion-ar','كيف تقلل متاجر المنتجات الفاخرة تردد العملاء قبل الشراء؟','industry-guides','buyer-intent'],
  ['b2b-website-redesign-ar','كيف تخطط شركات B2B لإعادة تصميم الموقع وفق أسئلة فريق المبيعات؟','web-seo','buyer-intent'],
  ['agency-proposal-review-ar','كيف تقارن عروض وكالات التسويق الرقمي بعيداً عن السعر المعلن فقط؟','digital-growth','buyer-intent'],
  ['seo-consultant-or-agency-ar','متى تختار مستشار SEO ومتى تحتاج إلى وكالة متخصصة؟','web-seo','buyer-intent'],
  ['customer-journey-website-audit-ar','كيف تراجع رحلة العميل من أول زيارة حتى الاستفسار المؤهل؟','digital-growth','buyer-intent'],
 ['gulf-brand-positioning','استراتيجية تموضع العلامة للشركات الخدمية في الإمارات وقطر','brand-strategy'],
 ['arabic-brand-message','صياغة رسالة علامة تجارية واضحة للجمهور العربي','brand-strategy'],
 ['arabic-visual-identity','بناء هوية بصرية مرنة ومتسقة للعلامة التجارية','brand-strategy'],
 ['gulf-brand-consistency','الحفاظ على اتساق العلامة عبر القنوات الرقمية في الخليج','brand-strategy'],
 ['rebrand-gulf','تخطيط إعادة العلامة التجارية مع الحفاظ على ثقة العملاء','brand-strategy'],
 ['website-design-brief-gulf','إعداد موجز واضح لمشروع تصميم موقع إلكتروني','web-seo'],
 ['landing-page-gulf','تصميم صفحة هبوط تساعد العميل على اتخاذ القرار','web-seo'],
 ['technical-seo-arabic','قائمة مراجعة SEO تقنية للشركات الصغيرة والمتوسطة','web-seo'],
 ['local-seo-gulf','تحسين الظهور المحلي في البحث للشركات الخدمية','web-seo'],
 ['arabic-site-architecture','تنظيم صفحات الموقع والروابط الداخلية وفق نية البحث','web-seo'],
 ['site-speed-gulf','تحسين أداء الموقع لتجربة أفضل على الهاتف','web-seo'],
 ['arabic-accessibility','جعل المواقع التجارية أوضح وأسهل للاستخدام','web-seo'],
 ['case-studies-gulf','تحويل المشاريع السابقة إلى دراسات حالة موثوقة','brand-strategy'],
 ['short-video-gulf','بناء نظام محتوى مستمر للفيديو القصير','creative-video'],
 ['service-video-arabic','تخطيط فيديوهات الخدمات وفق أسئلة العملاء','creative-video'],
 ['creative-testing-gulf','اختبار الأفكار الإعلانية وتحليل النتائج بوضوح','creative-video'],
 ['social-calendar-arabic','إعداد تقويم محتوى للتواصل الاجتماعي مرتبط بالأهداف','social-content'],
 ['content-reuse-arabic','إعادة تقديم الفكرة الواحدة في صيغ محتوى متعددة','social-content'],
 ['b2b-content-gulf','تخطيط محتوى مفيد لصنّاع القرار في قطاع الأعمال','social-content'],
 ['arabic-brand-voice','بناء صوت ثابت ومفيد للعلامة على وسائل التواصل','social-content'],
 ['ai-marketing-gulf','استخدام الذكاء الاصطناعي في التسويق مع الحفاظ على الجودة','digital-growth'],
 ['campaign-brief-arabic','إعداد موجز حملة يربط الإبداع بنتائج الأعمال','digital-growth'],
 ['marketing-metrics-arabic','اختيار مؤشرات تسويق رقمي تدعم القرارات','digital-growth'],
 ['conversion-audit-arabic','إجراء مراجعة عملية لتحويل الزوار إلى استفسارات','digital-growth'],
 ['lead-journey-gulf','تصميم رحلة استفسار بسيطة للخدمات المهنية','digital-growth'],
 ['ecommerce-trust-gulf','تحسين الثقة ومعلومات المنتجات في التجارة الإلكترونية','industry-guides'],
 ['hospitality-digital-brand','التجربة الرقمية للعلامات التجارية في قطاع الضيافة الخليجي','industry-guides'],
 ['real-estate-content-gulf','إعداد محتوى رقمي مفيد لشركات العقارات في الخليج','industry-guides'],
 ['clinic-website-gulf','الوضوح والتواصل المسؤول في مواقع العيادات','industry-guides'],
 ['professional-services-arabic','شرح الخدمات المهنية المعقدة بلغة واضحة عبر الإنترنت','industry-guides']
 ]
};
const schema = {type:'object',additionalProperties:false,properties:{
 slug:{type:'string'},title:{type:'string'},description:{type:'string'},excerpt:{type:'string'},category:{type:'string',enum:CATS},intro:{type:'string'},primaryKeyword:{type:'string'},searchIntent:{type:'string',enum:['informational','commercial-investigation','transactional','navigational']},answerSummary:{type:'string'},conversionBridge:{type:'string'},conversionLabel:{type:'string'},
 sections:{type:'array',items:{type:'object',additionalProperties:false,properties:{heading:{type:'string'},paragraphs:{type:'array',items:{type:'string'}},bullets:{type:'array',items:{type:'string'}}},required:['heading','paragraphs','bullets']}},
 faq:{type:'array',items:{type:'object',additionalProperties:false,properties:{q:{type:'string'},a:{type:'string'}},required:['q','a']}},
 sources:{type:'array',items:{type:'object',additionalProperties:false,properties:{title:{type:'string'},url:{type:'string'}},required:['title','url']}}
},required:['slug','title','description','excerpt','category','intro','primaryKeyword','searchIntent','answerSummary','conversionBridge','conversionLabel','sections','faq','sources']};
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
async function loadArticles(lang){
 const dir=path.join(ROOT,'blog','data',lang);let files=[];
 try{files=(await fs.readdir(dir)).filter(f=>f.endsWith('.json'))}catch{}
 const list=[];
 for(const file of files){try{list.push(JSON.parse(await fs.readFile(path.join(dir,file),'utf8')))}catch(e){console.warn('Skipping invalid JSON',file,e.message)}}
 return list;
}
function plainText(value){
 return String(value||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&#x27;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
}
async function loadExistingHtmlArticles(lang,knownSlugs=new Set()){
 const dir=path.join(ROOT,'blog',lang,'articles');let files=[];
 try{files=(await fs.readdir(dir)).filter(f=>f.endsWith('.html'))}catch{}
 const list=[];
 for(const file of files){
  const slug=file.slice(0,-5);if(knownSlugs.has(slug))continue;
  try{
   const html=await fs.readFile(path.join(dir,file),'utf8');
   const h1=html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
   const metaDescription=html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
   const standfirst=html.match(/<p[^>]*class=["'][^"']*standfirst[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
   const ogTitle=html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i);
   const date=html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})"/i)||html.match(/<meta[^>]+article:published_time[^>]+content=["'](\d{4}-\d{2}-\d{2})["']/i);
   const tag=html.match(/<div[^>]*class=["'][^"']*tag[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
   const title=plainText(h1?.[1]||ogTitle?.[1]||'');
   const description=plainText(metaDescription?.[1]||standfirst?.[1]||title);
   if(!title)continue;
   list.push({lang,slug,title,excerpt:plainText(standfirst?.[1]||description),description,publishedAt:date?.[1]||'',updatedAt:date?.[1]||'',category:'digital-growth',market:'existing published article',legacyHtml:true,tag:plainText(tag?.[1]||'')});
  }catch(e){console.warn('Could not inventory existing article',file,e.message)}
 }
 return list;
}
function words(a){return [a.title,a.description,a.excerpt,a.intro,a.answerSummary,a.conversionBridge,a.conversionLabel,...a.sections.flatMap(s=>[s.heading,...s.paragraphs,...(s.bullets||[])]),...(a.faq||[]).flatMap(f=>[f.q,f.a])].join(' ').trim().split(/\s+/).length}
function validSlug(s){return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)&&s.length<=90}
async function requestArticle(t,existingTitles,existingSlugs){
 const locale=L[t.lang];
 const instructions='You are the senior research editor for RocketPen Digital Studio. Use the built-in web_search tool before drafting and consult 3-5 trustworthy sources that directly support the article. Create original, people-first, non-commodity content with a distinct angle; never mass-produce near-duplicate pages. First research and infer the primary query/search intent (informational, commercial-investigation, transactional or navigational); do not invent search volume, keyword difficulty, market statistics, case studies, testimonials or first-hand experience. Use the primary keyword naturally in a descriptive title, introduction and relevant headings where appropriate, with related terms and concrete questions instead of keyword stuffing. Provide an answer-first summary (roughly 40-80 words) that directly answers the core query, then explain practical steps, decision criteria, examples, trade-offs, limitations and market-specific considerations. Use natural '+locale.name+' for this market: '+t.market+'. The article should be genuinely useful even if the reader never contacts us. Where relevant, explain what a customer should compare or prepare before hiring a studio. For CUSTOMER-INTENT topics, prioritize commercial investigation or transactional search intent: buyer questions, provider-selection criteria, common failure diagnosis, budget factors (never invented prices), red flags, decision checklists, and a practical path to solving the the customer problem. These must be distinct from broad sector/educational articles; never imply guaranteed results. Build an ethical conversion path: the conversionBridge MUST be a complete, contextual sentence of 35-260 characters that connects the reader’s specific problem to a useful next step with RocketPen Digital Studio; the conversionLabel must be a concise natural CTA of 3-50 characters in the article language, without pressure, false urgency or guaranteed outcomes. Write 1,100-1,500 visible words, at least 7 substantive sections, and two developed paragraphs of at least 70 words each per section, plus useful bullets, 4 specific FAQs with substantive answers and 3-5 HTTPS sources. Do not compress sections or substitute short summaries for developed paragraphs. Do not make rankings, traffic, revenue or legal/compliance promises. Return only the requested JSON schema; slugs must be unique ASCII kebab-case.';
 const prompt='Create one publish-ready long-form article for RocketPen Digital Studio.\nLanguage: '+locale.name+' ('+t.lang+')\nTarget market: '+t.market+'\nTopic seed: '+t.topic+'\nEditorial topic ID: '+t.topicId+'\nCategory: '+t.category+'\nAllowed categories: '+CATS.join(', ')+'\nExisting titles to avoid: \n'+existingTitles.slice(-100).map(x=>'- '+x).join('\n')+'\nExisting slugs to avoid: '+existingSlugs.slice(-100).join(', ')+'\nThe article must be original for this locale, not a shallow translation of another page. Explain the reader problem, give a clear framework and checklist, note trade-offs, use specific hypothetical examples only when labelled hypothetical, and cite sources with exact URLs. Do not fabricate market statistics.';
 for(let attempt=0;attempt<5;attempt++){
  const duplicateFailure=/slug invalid or already used|article title already exists/i.test(t.validationError||'');
  const retryInstruction=attempt?(duplicateFailure
   ?'\nPREVIOUS DRAFT REJECTED: its title or slug duplicates existing content. Do NOT reuse the previous title or slug. Discard that angle and create a distinctly different buyer problem, title and unique ASCII kebab-case slug. Existing titles/slugs listed in the prompt are forbidden; check the complete list carefully. Keep the new article useful and original.\nREJECTED DRAFT JSON: '+JSON.stringify(t.previousDraft||{})+'\nReturn a complete new article JSON, not commentary.'
   :'\nPREVIOUS DRAFT FAILED THESE QUALITY CHECKS: '+t.validationError+'. Improve the previous draft below rather than repeating its shortcomings. Preserve useful, correct material but expand it to at least 1,000 words with 7 substantive sections, two paragraphs of 70+ words in each section, 4 detailed FAQs and 3-5 HTTPS sources. Ensure conversionBridge is 35-260 characters and conversionLabel is 3-50 characters.\nPREVIOUS DRAFT JSON: '+JSON.stringify(t.previousDraft||{})+'\nReturn a complete corrected article JSON, not commentary.'
  ):'';
  let response;
  try{
   response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,tools:[{type:'web_search'}],tool_choice:'required',instructions:instructions,input:prompt+retryInstruction,max_output_tokens:12000,text:{format:{type:'json_schema',name:'digital_blog_article',strict:true,schema:schema}}}),signal:AbortSignal.timeout(90000)});
  }catch(err){t.validationError='OpenAI request timed out or failed: '+String(err).slice(0,240);console.warn(t.validationError);continue}
  if(!response.ok){const detail=(await response.text()).slice(0,600);t.validationError='OpenAI API error '+response.status+': '+detail;if(response.status===429||response.status>=500)continue;throw new Error(t.validationError)}
  const result=await response.json();
  const output=(result.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
  let a;try{a=JSON.parse(output)}catch{t.validationError='invalid JSON output';continue}
  const safeBridge={
   en:'If this challenge is affecting qualified enquiries, a focused review of your website, messaging and conversion path can help identify practical next steps.',
   tr:'Bu sorun işletmenizin nitelikli taleplerini etkiliyorsa web sitenizi, mesajınızı ve dönüşüm yolculuğunu incelemek uygulanabilir sonraki adımları belirlemeye yardımcı olabilir.',
   ar:'إذا كانت هذه المشكلة تؤثر في الاستفسارات الجادة، فقد تساعد مراجعة الموقع والرسائل ومسار التحويل في تحديد خطوات عملية مناسبة.'
  };
  const safeLabel={en:'Discuss your project',tr:'Projenizi değerlendirelim',ar:'ناقش مشروعك معنا'};
  if(typeof a.conversionBridge!=='string'||a.conversionBridge.trim().length<35||a.conversionBridge.trim().length>260)a.conversionBridge=safeBridge[t.lang];
  if(typeof a.conversionLabel!=='string'||a.conversionLabel.trim().length<3||a.conversionLabel.trim().length>50)a.conversionLabel=safeLabel[t.lang];
  const errors=[];
  if(!validSlug(a.slug)||existingSlugs.includes(a.slug))errors.push('slug invalid or already used');
  if(!a.title||a.title.length<25)errors.push('title too short');
  if(!a.description||a.description.length<80)errors.push('description too short');
  if(!a.excerpt||a.excerpt.length<45)errors.push('excerpt too short');
  if(!a.primaryKeyword||a.primaryKeyword.trim().length<3||a.primaryKeyword.length>100)errors.push('primary keyword missing or invalid');
  if(!['informational','commercial-investigation','transactional','navigational'].includes(a.searchIntent))errors.push('search intent missing or invalid');
  if(!a.answerSummary||a.answerSummary.trim().split(/\s+/).length<25||a.answerSummary.length>700)errors.push('direct answer summary missing or too short');
  if(!a.conversionBridge||a.conversionBridge.trim().length<35||a.conversionBridge.length>260)errors.push('contextual conversion bridge missing or invalid');
  if(!a.conversionLabel||a.conversionLabel.trim().length<3||a.conversionLabel.length>50)errors.push('conversion label missing or invalid');
  if(existingTitles.some(title=>String(title).trim().toLowerCase()===String(a.title).trim().toLowerCase()))errors.push('article title already exists');
  if(!CATS.includes(a.category))errors.push('category is invalid');
  if(!Array.isArray(a.sections)||a.sections.length<6)errors.push('fewer than six sections');
  if(!Array.isArray(a.faq)||a.faq.length<4)errors.push('fewer than four FAQs');
  const seenSourceUrls = new Set();
  a.sources=(a.sources||[]).filter(s=>{
   if(!s||typeof s.title!=='string'||!s.title.trim()||typeof s.url!=='string')return false;
   try{
    const u=new URL(s.url);
    if(u.protocol!=='https:'||!u.hostname||u.username||u.password)return false;
    const normalized=u.href;
    if(seenSourceUrls.has(normalized))return false;
    seenSourceUrls.add(normalized);
    return true;
   }catch{return false}
  });
  if(a.sources.length<3)errors.push('fewer than three HTTPS sources');
  if(words(a)<800)errors.push('article has only '+words(a)+' words; minimum quality gate is 800');
  if(errors.length){
   t.validationError=errors.join('; ');t.previousDraft=a;
   // Put rejected duplicate values at the end of the prompt's recent exclusion lists.
   if(errors.includes('article title already exists')&&a.title&&!existingTitles.some(x=>String(x).trim().toLowerCase()===String(a.title).trim().toLowerCase()))existingTitles.push(a.title);
   if(errors.includes('slug invalid or already used')&&a.slug&&!existingSlugs.includes(a.slug))existingSlugs.push(a.slug);
   continue;
  }
  a.sources=a.sources.slice(0,5);a.lang=t.lang;a.market=t.market;a.topicId=t.topicId;a.publishedAt=TODAY;a.updatedAt=TODAY;
  return a;
 }
 throw new Error('Article failed editorial quality checks ('+t.lang+'/'+t.topicId+'): '+t.validationError);
}
function renderArticle(a,availableArticles=[]){
 const locale=L[a.lang],rtl=a.lang==='ar',urlPath='/blog/'+a.lang+'/articles/'+a.slug+'.html';
 const canonical=SITE_URL?'<link rel="canonical" href="'+esc(SITE_URL+urlPath)+'">':'';
 const count=words(a),minutes=Math.max(4,Math.ceil(count/(rtl?190:220)));
 const jsonLd={'@context':'https://schema.org','@type':'BlogPosting',headline:a.title,description:a.description,datePublished:a.publishedAt,dateModified:a.updatedAt||a.publishedAt,author:{'@type':'Organization',name:'RocketPen Digital Studio Editorial Team'},publisher:{'@type':'Organization',name:'RocketPen Digital Studio'},inLanguage:a.lang,keywords:[a.primaryKeyword,a.category].filter(Boolean).join(', '),articleSection:CAT[a.lang][a.category]||a.category,wordCount:count};
 if(SITE_URL)jsonLd.mainEntityOfPage=SITE_URL+urlPath;
 const leadCta='<aside class="cta cta-inline"><h2>'+esc(a.conversionLabel||locale.contact)+'</h2><p>'+esc(a.conversionBridge||locale.cta)+'</p><a href="'+locale.home+'#contact">'+esc(a.conversionLabel||locale.contact)+'</a></aside>';
 const sections=a.sections.map((s,i)=>'<section><h2>'+esc(s.heading)+'</h2>'+(s.paragraphs||[]).map(p=>'<p>'+esc(p)+'</p>').join('')+((s.bullets||[]).length?'<ul>'+s.bullets.map(b=>'<li>'+esc(b)+'</li>').join('')+'</ul>':'')+'</section>'+(i===2?leadCta:'')).join('\n');
 const faq='<section class="faq"><h2>'+locale.faq+'</h2>'+a.faq.map(x=>'<div><h3>'+esc(x.q)+'</h3><p>'+esc(x.a)+'</p></div>').join('')+'</section>';
 const sources='<section class="sources"><h2>'+locale.sources+'</h2><ul>'+a.sources.map(s=>'<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+'</a></li>').join('')+'</ul></section>';
 const relatedArticles=availableArticles.filter(x=>x.lang===a.lang&&x.slug!==a.slug&&x.category===a.category).slice(0,3);
 const related=relatedArticles.length?'<section class="related"><h2>'+locale.related+'</h2><ul>'+relatedArticles.map(x=>'<li><a href="/blog/'+a.lang+'/articles/'+esc(x.slug)+'.html">'+esc(x.title)+'</a></li>').join('')+'</ul></section>':'';

 const home='../../..'+locale.home;
 return '<!doctype html>\n<html lang="'+a.lang+'"'+(rtl?' dir="rtl"':'')+'><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<link rel="icon" type="image/svg+xml" href="/asset/logo/favicon.svg">'+
 '<title>'+esc(a.title)+' | RocketPen Digital Studio</title><meta name="description" content="'+esc(a.description)+'"><meta name="robots" content="index,follow">'+canonical+
 '<meta property="og:type" content="article"><meta property="og:title" content="'+esc(a.title)+'"><meta property="og:description" content="'+esc(a.description)+'"><meta property="article:published_time" content="'+a.publishedAt+'">'+
 '<script type="application/ld+json">'+JSON.stringify(jsonLd).replace(/</g,'\\u003c')+'</script>'+
 '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">'+
 '<style>:root{--yellow:#ffeb00;--pad:clamp(22px,5.5vw,88px);--font:"DM Sans",sans-serif;--display:"Space Grotesk",sans-serif}*{box-sizing:border-box}body{margin:0;background:#f7f7f5;color:#15171d;font-family:var(--font);line-height:1.8}.top{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:12px var(--pad);background:rgba(7,9,13,.88);color:white;border-bottom:1px solid #ffffff20;gap:14px;flex-wrap:nowrap;backdrop-filter:blur(18px);transition:background .3s ease,border-color .3s ease}.top.is-scrolled{background:rgba(7,9,13,.96)}.logo{width:clamp(210px,24vw,320px);max-width:100%;max-height:76px;object-fit:contain;filter:drop-shadow(0 0 5px rgba(255,255,255,.32)) drop-shadow(0 0 13px rgba(255,255,255,.16))}.nav{display:flex;align-items:center;gap:18px;flex-wrap:wrap;font-size:12px}.nav a{color:#e4e6ea;text-decoration:none}.language-picker{position:relative;z-index:30}.language-picker summary{list-style:none}.language-picker summary::-webkit-details-marker{display:none}.language-picker .lang{display:flex;align-items:center;gap:9px;padding:10px 13px;border:1px solid #ffffff3d;border-radius:4px;background:#ffffff0b;color:#fff;font:inherit;font-size:11px;cursor:pointer}.language-picker .lang-label{font-size:8px;letter-spacing:1.2px;color:#aeb3bd;border-left:1px solid #ffffff2e;padding-left:9px}.lang-chevron{width:7px;height:7px;border-right:1px solid var(--yellow);border-bottom:1px solid var(--yellow);transform:rotate(45deg)}.language-menu{position:absolute;top:calc(100% + 10px);right:0;width:190px;padding:7px;background:rgba(12,15,21,.97);border:1px solid #ffffff29;border-radius:8px;box-shadow:0 18px 55px #0006;backdrop-filter:blur(22px)}.language-option{display:grid;grid-template-columns:34px 1fr 14px;gap:9px;padding:12px 10px;color:#f7f7f5;text-decoration:none;font-size:12px}.language-option-code{color:var(--yellow);font-size:10px;font-weight:700}.language-option:hover{background:#ffeb0014}main{padding:clamp(45px,7vw,90px) 22px 85px}.article{max-width:860px;margin:auto}.crumb{font-size:12px;color:#686d77;margin-bottom:25px}.crumb a{color:#555b65}.tag{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#b50e1d;font-weight:700}.article h1{font:700 clamp(38px,6.5vw,66px)/1.02 var(--display);letter-spacing:-.06em;margin:18px 0 22px}.standfirst{font-size:clamp(17px,2vw,21px);line-height:1.65;color:#4e535d}.meta{display:flex;gap:14px;flex-wrap:wrap;color:#777c85;font-size:12px;margin:22px 0 36px;padding-bottom:24px;border-bottom:1px solid #dcdee1}.article section{margin:34px 0}.article h2{font:600 clamp(25px,3.8vw,34px)/1.18 var(--display);letter-spacing:-.035em;margin:0 0 14px}.article h3{font-size:18px}.article p,.article li{font-size:16px;line-height:1.88;color:#3d424b}.article a{color:#a30c1b}.article .faq>div{padding:14px 0;border-bottom:1px solid #dfe0e2}.cta{margin-top:54px;background:#080a0f;color:white;padding:30px;border-left:4px solid var(--yellow)}.cta.cta-inline{margin:36px 0;padding:22px 26px}.cta h2{color:white}.cta p{color:#bec3cb}.cta a{display:inline-block;padding:13px 18px;background:var(--yellow);color:#0a0b0e;text-decoration:none;font-weight:700;font-size:12px;margin-top:6px}.end{padding:22px var(--pad);background:#080a0f;color:#a9afba;display:flex;justify-content:space-between;gap:16px;font-size:12px}.end a{color:#d9dce2;text-decoration:none}@media(max-width:760px){.top{padding:14px 20px}.logo{width:clamp(175px,54vw,235px);max-height:48px}.language-picker .lang{padding:9px 10px}.language-picker .lang-label{display:none}.article h1{font-size:clamp(37px,10.5vw,52px)}.article p,.article li{font-size:15px}.cta{padding:23px}.end{flex-direction:column;padding:20px}}.arabic{font-family:Tahoma,Arial,sans-serif}.arabic .article h1,.arabic .article h2{letter-spacing:0}</style><link rel="stylesheet" href="/asset/css/responsive-overrides.css"></head><body class="'+(rtl?'arabic':'')+'">'+
 '<header class="top"><a class="brand-link" href="'+home+'" aria-label="RocketPen Digital Studio"><img class="logo" src="/asset/logo/logo-header.png" alt="RocketPen Digital Studio"></a></header>'+
 '<main><article class="article"><div class="crumb"><a href="'+locale.blog+'">'+locale.blogLabel+'</a> / '+esc(CAT[a.lang][a.category]||a.category)+'</div><div class="tag">'+esc(CAT[a.lang][a.category]||a.category)+'</div><h1>'+esc(a.title)+'</h1><p class="standfirst">'+esc(a.excerpt)+'</p><div class="meta"><span>'+a.publishedAt+'</span><span>'+count+' '+locale.read+'</span><span>RocketPen Digital Studio Editorial Team</span></div><p>'+esc(a.intro)+'</p>'+sections+faq+sources+
 '<div class="cta"><h2>'+locale.contact+'</h2><p>'+locale.cta+'</p><a href="'+home+'#contact">'+locale.contact+'</a></div></article></main>'+
 '<footer class="end"><span>© '+a.publishedAt.slice(0,4)+' RocketPen Digital Studio</span><a href="'+locale.blog+'">← '+locale.blogLabel+'</a><a href="'+home+'">'+locale.homeLabel+'</a></footer><script>const topbar=document.querySelector(\'.top\');const onScroll=()=>topbar.classList.toggle(\'is-scrolled\',window.scrollY>12);window.addEventListener(\'scroll\',onScroll,{passive:true});onScroll();</script></body></html>';
}
function articleCard(a,lang,index){
 const label=CAT[lang][a.category]||a.category;
 const link='/blog/'+lang+'/articles/'+esc(a.slug)+'.html';
 return '<article class="article-card" data-category="'+esc(a.category)+'"><div class="article-no">'+String(index+1).padStart(2,'0')+' / '+esc(label.toUpperCase())+'</div><div><h3><a href="'+link+'">'+esc(a.title)+'</a></h3><p>'+esc(a.excerpt||a.description)+'</p></div><a class="read" href="'+link+'">'+(lang==='ar'?'اقرأ الدليل':lang==='tr'?'Rehberi oku':'Read the guide')+'</a></article>';
}
function paginationMarkup(lang,page,total){
 if(total<=1)return '';
 const labels={en:{prev:'Previous',next:'Next'},tr:{prev:'Önceki',next:'Sonraki'},ar:{prev:'السابق',next:'التالي'}};
 const L=labels[lang],url=n=>n===1?'/blog/'+lang+'/index.html':'/blog/'+lang+'/page/'+n+'.html';
 let out='<nav class="pagination" aria-label="Pagination">';
 if(page>1)out+='<a href="'+url(page-1)+'" rel="prev">'+L.prev+'</a>';
 const lo=Math.max(1,page-2),hi=Math.min(total,page+2);
 if(lo>1)out+='<a href="'+url(1)+'">1</a><span aria-hidden="true">…</span>';
 for(let n=lo;n<=hi;n++)out+=n===page?'<span class="current" aria-current="page">'+n+'</span>':'<a href="'+url(n)+'">'+n+'</a>';
 if(hi<total)out+='<span aria-hidden="true">…</span><a href="'+url(total)+'">'+total+'</a>';
 if(page<total)out+='<a href="'+url(page+1)+'" rel="next">'+L.next+'</a>';
 return out+'</nav>';
}
async function renderIndex(lang,articles){
 const file=path.join(ROOT,'blog',lang,'index.html');let html=await fs.readFile(file,'utf8');
 const start='<!-- POSTS_START -->',end='<!-- POSTS_END -->',si=html.indexOf(start),ei=html.indexOf(end);
 if(si<0||ei<si)throw new Error('Missing article markers in blog/'+lang+'/index.html');
 const sorted=articles.slice().sort((a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||''));
 const PAGE_SIZE=lang==='en'?24:15;
 const total=Math.max(1,Math.ceil(sorted.length/PAGE_SIZE));
 const pagerStart='<!-- PAGINATION_START -->',pagerEnd='<!-- PAGINATION_END -->';
 const cards=sorted.slice(0,PAGE_SIZE).map((a,i)=>articleCard(a,lang,i)).join('\n');
 html=html.slice(0,si+start.length)+'\n'+cards+'\n'+html.slice(ei);
 if(!html.includes(pagerStart))html=html.replace(end,end+'\n'+pagerStart+'\n'+pagerEnd);
 const ps=html.indexOf(pagerStart),pe=html.indexOf(pagerEnd);
 html=html.slice(0,ps+pagerStart.length)+'\n'+paginationMarkup(lang,1,total)+'\n'+html.slice(pe);
 await fs.writeFile(file,html);
 const archiveDir=path.join(ROOT,'blog',lang,'page');
 await fs.mkdir(archiveDir,{recursive:true});
 for(let page=2;page<=total;page++){
  let archive=html;
  const asi=archive.indexOf(start),aei=archive.indexOf(end);
  const pageCards=sorted.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE).map((a,i)=>articleCard(a,lang,(page-1)*PAGE_SIZE+i)).join('\n');
  archive=archive.slice(0,asi+start.length)+'\n'+pageCards+'\n'+archive.slice(aei);
  const aps=archive.indexOf(pagerStart),ape=archive.indexOf(pagerEnd);
  archive=archive.slice(0,aps+pagerStart.length)+'\n'+paginationMarkup(lang,page,total)+'\n'+archive.slice(ape);
  archive=archive.replace(/<title>[^<]*<\/title>/i,'<title>'+({en:'Articles — Page ',tr:'Makaleler — Sayfa ',ar:'المقالات — الصفحة '}[lang])+page+' | RocketPen Digital Studio</title>');
  archive=archive.replace(/<meta name="description" content="[^"]*">/i,'<meta name="description" content="'+esc(({en:'Browse practical RocketPen Digital Studio articles. Archive page ',tr:'RocketPen Digital Studio makalelerini ve uygulamalı rehberlerini keşfedin. Arşiv sayfası ',ar:'تصفح مقالات وأدلة RocketPen Digital Studio. صفحة الأرشيف '}[lang])+page)+'">');
  archive=archive.replaceAll('src="../../asset/logo/logo-header.png"','src="/asset/logo/logo-header.png"');
  archive=archive.replaceAll('href="../../index.html','href="/index.html');
  archive=archive.replaceAll('href="../../languages/tr.html','href="/languages/tr.html');
  archive=archive.replaceAll('href="../../languages/ar.html','href="/languages/ar.html');
  archive=archive.replace(/<link rel="canonical" href="[^"]*">/i,'');
  if(SITE_URL)archive=archive.replace('</head>','<link rel="canonical" href="'+SITE_URL+'/blog/'+lang+'/page/'+page+'.html">\n</head>');
  await fs.writeFile(path.join(archiveDir,page+'.html'),archive);
 }
 for(const name of await fs.readdir(archiveDir)){
  const n=Number(name.replace('.html',''));
  if(name.endsWith('.html')&&Number.isInteger(n)&&n>=2&&n>total)await fs.rm(path.join(archiveDir,name));
 }
}
async function updateSeoBlocks(){
 if(!SITE_URL){console.warn('SITE_URL is not configured; canonical tags and hreflang annotations are skipped. Set the repository variable SITE_URL to the canonical site origin.');return}
 let parsedSite;
 try{parsedSite=new URL(SITE_URL)}catch{throw new Error('SITE_URL must be a full HTTPS origin such as https://www.example.com')}
 if(parsedSite.protocol!=='https:'||parsedSite.origin!==SITE_URL)throw new Error('SITE_URL must be an HTTPS origin without a path, query or fragment, e.g. https://www.example.com');
 const base=parsedSite.origin
 const locales=[['en','/'],['tr','/languages/tr.html'],['ar','/languages/ar.html']];
 const pageSet=[
  {file:'index.html',path:'/',group:locales},
  {file:'languages/tr.html',path:'/languages/tr.html',group:locales},
  {file:'languages/ar.html',path:'/languages/ar.html',group:locales},
  {file:'blog/en/index.html',path:'/blog/en/index.html',group:[['en','/blog/en/index.html'],['tr','/blog/tr/index.html'],['ar','/blog/ar/index.html']]},
  {file:'blog/tr/index.html',path:'/blog/tr/index.html',group:[['en','/blog/en/index.html'],['tr','/blog/tr/index.html'],['ar','/blog/ar/index.html']]},
  {file:'blog/ar/index.html',path:'/blog/ar/index.html',group:[['en','/blog/en/index.html'],['tr','/blog/tr/index.html'],['ar','/blog/ar/index.html']]}
 ];
 for(const page of pageSet){
  const file=path.join(ROOT,page.file);let html=await fs.readFile(file,'utf8');
  const links='<link rel="canonical" href="'+esc(base+page.path)+'">\n'+page.group.map(item=>'<link rel="alternate" hreflang="'+item[0]+'" href="'+esc(base+item[1])+'">').join('\n')+'\n<link rel="alternate" hreflang="x-default" href="'+esc(base+(page.file.startsWith('blog/')?'/blog/en/index.html':'/'))+'">';
  const re=/<!-- SEO_ALTERNATES_START -->[\s\S]*?<!-- SEO_ALTERNATES_END -->/;
  if(!re.test(html))throw new Error('Missing SEO alternate markers in '+page.file);
  html=html.replace(re,'<!-- SEO_ALTERNATES_START -->\n'+links+'\n<!-- SEO_ALTERNATES_END -->');
  await fs.writeFile(file,html);
 }
}
async function writeSitemap(all){
 const robotsLines=['User-agent: *','Allow: /'];
 if(SITE_URL)robotsLines.push('Sitemap: '+SITE_URL+'/sitemap.xml');
 await fs.writeFile(path.join(ROOT,'robots.txt'),robotsLines.join('\n')+'\n');
 if(!SITE_URL){console.warn('SITE_URL missing: robots.txt was written, but canonical URLs, hreflang and sitemap.xml are skipped. Configure the repository variable SITE_URL to enable them.');return}
 const entries=[['/',''],['/languages/tr.html',''],['/languages/ar.html',''],['/blog/en/index.html',''],['/blog/tr/index.html',''],['/blog/ar/index.html','']];
 for(const lang of LANGS){const dir=path.join(ROOT,'blog',lang,'page');try{for(const name of await fs.readdir(dir)){if(/^\d+\.html$/.test(name))entries.push(['/blog/'+lang+'/page/'+name,'']);}}catch{}}
 for(const a of all)entries.push(['/blog/'+a.lang+'/articles/'+a.slug+'.html',a.updatedAt||a.publishedAt]);
 const body=entries.map(e=>'<url><loc>'+esc(SITE_URL+e[0])+'</loc>'+(e[1]?'<lastmod>'+e[1]+'</lastmod>':'')+'</url>').join('\n');
 await fs.writeFile(path.join(ROOT,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+body+'\n</urlset>\n');
}
async function main(){
 if(!API_KEY)throw new Error('OPENAI_API_KEY is missing. Add it as a repository Actions secret before automatic publishing can run.');
 if(SITE_URL){
  let configuredSite;
  try{configuredSite=new URL(SITE_URL)}catch{throw new Error('SITE_URL must be a full HTTPS origin such as https://www.example.com')}
  if(configuredSite.protocol!=='https:'||configuredSite.origin!==SITE_URL)throw new Error('SITE_URL must be an HTTPS origin without a path, query or fragment, e.g. https://www.example.com');
 }
 const byLang={};for(const lang of LANGS)byLang[lang]=await loadArticles(lang);
 const existingByLang={};
 for(const lang of LANGS)existingByLang[lang]=await loadExistingHtmlArticles(lang,new Set(byLang[lang].map(a=>a.slug)));
 const all=LANGS.flatMap(lang=>[...existingByLang[lang],...byLang[lang]]);
 const titles=all.map(a=>a.title),slugs=all.map(a=>a.slug);
 const TARGET_PER_LANGUAGE=100,BATCH_PER_LANGUAGE=10;
 const variants=['implementation guide','decision framework','audit checklist','common mistakes and alternatives','measurement and optimization'];
 const variantId=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const normalizeTopicId=value=>String(value||'').replace(/-\d{4}-\d{2}-\d{2}$/,'');
 const counts=Object.fromEntries(LANGS.map(lang=>[lang,Math.max(0,Math.min(BATCH_PER_LANGUAGE,TARGET_PER_LANGUAGE-byLang[lang].length))]));
 const markets={
  en:['United States','United Kingdom','Canada','Australia','International English-speaking markets'],
  tr:['Türkiye','Türkiye — local service businesses','Türkiye — B2B services'],
  ar:['United Arab Emirates','Qatar','Saudi Arabia','Arabic-speaking Gulf markets']
 };
 const tasks=[];
 for(const lang of LANGS){
  const pool=TOPICS[lang],used=new Set(byLang[lang].map(a=>normalizeTopicId(a.topicId)));
  let count=0;
  const addFromPool=(sourcePool,desired,buyerIntent)=>{
   let added=0;
   for(const item of sourcePool){
    if(added>=desired)break;
    const angles=buyerIntent?['buyer-intent-solution-guide']:variants;
    for(const variant of angles){
     if(added>=desired)break;
     const topicId=item[0]+'-'+variantId(variant);
     if(used.has(topicId))continue;
     used.add(topicId);
     const market=markets[lang][(byLang[lang].length+count)%markets[lang].length];
     const buyerBrief=buyerIntent?' This is a CUSTOMER-INTENT article, not a general sector explainer. Prioritize the real phrases a prospective buyer might search when deciding whether to hire, compare providers, fix a failing result, qualify a premium service, or reach a new market. Give practical diagnosis, selection criteria, budget drivers without inventing prices, red flags, an actionable checklist, and a non-pushy next step. Distinguish commercial investigation from purely informational intent.':'';
     const angle=buyerIntent?'buyer-intent-solution-guide':variant;
     tasks.push({lang,topic:item[1]+'. Editorial angle: '+angle+'. Market emphasis: '+market+'. Research actual query language and intent before drafting.'+buyerBrief,topicId,category:item[2],market});
     count++;added++;
    }
   }
   return added;
  };
  const buyerPool=pool.filter(item=>item[3]==='buyer-intent');
  const sectorPool=pool.filter(item=>item[3]!=='buyer-intent');
  const buyerTarget=Math.min(Math.ceil(counts[lang]/2),counts[lang]);
  const buyerAdded=addFromPool(buyerPool,buyerTarget,true);
  const sectorAdded=addFromPool(sectorPool,counts[lang]-buyerAdded,false);
  if(buyerAdded+sectorAdded<counts[lang])addFromPool(buyerPool,counts[lang]-buyerAdded-sectorAdded,true);
  if(count!==counts[lang])throw new Error('Not enough unused topic-angle combinations to reach the article target for '+lang+' ('+count+'/'+counts[lang]+')');
 }
 console.log('Article target: '+TARGET_PER_LANGUAGE+' per language. Current: '+LANGS.map(lang=>lang.toUpperCase()+' '+byLang[lang].length+'/'+TARGET_PER_LANGUAGE).join(', ')+'. This batch: '+tasks.length+' ('+counts.en+' EN, '+counts.tr+' TR, '+counts.ar+' AR).');
 if(tasks.length&&!API_KEY)throw new Error('OPENAI_API_KEY is missing. Add it as a repository Actions secret before the remaining articles can be researched and generated.');
 const newlyGenerated=[];
 for(let i=0;i<tasks.length;i++){
  const t=tasks[i];console.log('Generating '+(i+1)+'/'+tasks.length+' ('+t.lang+'): '+t.topic);
  const a=await requestArticle(t,titles,slugs);
  a.category=t.category;a.market=t.market;a.topicId=t.topicId;a.publishedAt=TODAY;a.updatedAt=TODAY;
  if(slugs.includes(a.slug))a.slug=a.slug+'-'+TODAY;
  if(!validSlug(a.slug))throw new Error('Invalid slug: '+a.slug);
  const dataDir=path.join(ROOT,'blog','data',t.lang),pageDir=path.join(ROOT,'blog',t.lang,'articles');
  await fs.mkdir(dataDir,{recursive:true});await fs.mkdir(pageDir,{recursive:true});
  await fs.writeFile(path.join(dataDir,a.slug+'.json'),JSON.stringify(a,null,2)+'\n');
  await fs.writeFile(path.join(pageDir,a.slug+'.html'),renderArticle(a,all));
  byLang[t.lang].push(a);all.push(a);titles.push(a.title);slugs.push(a.slug);newlyGenerated.push(a);
 }
 for(const a of newlyGenerated){const pageDir=path.join(ROOT,'blog',a.lang,'articles');await fs.mkdir(pageDir,{recursive:true});await fs.writeFile(path.join(pageDir,a.slug+'.html'),renderArticle(a,all));}
 for(const lang of LANGS){const indexRecords=[...existingByLang[lang],...byLang[lang]];const unique=new Map(indexRecords.map(a=>[a.slug,a]));await renderIndex(lang,[...unique.values()]);}
 await updateSeoBlocks();
 await writeSitemap(all);
 const reportBase=SITE_URL||'https://rocketpendigital.com';
 const summaryPath=process.env.GITHUB_STEP_SUMMARY;
 if(summaryPath){
  const summary=['## Daily Digital Blog report — '+TODAY,'','Generated and quality-checked **'+newlyGenerated.length+' articles**: **'+newlyGenerated.filter(a=>a.lang==='en').length+' English**, **'+newlyGenerated.filter(a=>a.lang==='tr').length+' Turkish**, **'+newlyGenerated.filter(a=>a.lang==='ar').length+' Arabic**.','', '### English'];
  for(const lang of LANGS){if(lang!=='en')summary.push('### '+(lang==='tr'?'Türkçe':'العربية'));for(const a of newlyGenerated.filter(x=>x.lang===lang))summary.push('- ['+a.title+']('+reportBase+'/blog/'+a.lang+'/articles/'+a.slug+'.html)');summary.push('');}
  summary.push('> Publication links are confirmed after the following GitHub commit-and-push step succeeds.');
  await fs.appendFile(summaryPath,summary.join('\n')+'\n');
 }
 console.log('Generated 30 localized articles (10 per language). The workflow will commit and push them next. Add SITE_URL as a repository variable for absolute canonical URLs and sitemap.xml.');
}
main().catch(err=>{console.error(err);process.exit(1)});
