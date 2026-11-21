# Materna

<!-- i18n-nav:start -->
<p align="center">
  <a href="README.md">🇬🇧 English</a>
  <a href="README.es.md">🇪🇸 Español</a>
  <a href="README.pt.md">🇧🇷 Português</a>
  <a href="README.de.md">🇩🇪 Deutsch</a>
  <a href="README.cn.md">🇨🇳 简体中文</a>
  <a href="README.ru.md">🇷🇺 Русский</a>
  <strong>🇹🇷 Türkçe</strong>
  <a href="README.ja.md">🇯🇵 日本語</a>
</p>
<!-- i18n-nav:end -->

<p align="center">
  <a href="https://www.npmjs.com/package/materna"><img src="https://img.shields.io/npm/v/materna.svg?style=flat-square&color=blue" alt="npm version"></a>&nbsp;
  <a href="https://www.npmjs.com/package/materna"><img src="https://img.shields.io/npm/dm/materna.svg?style=flat-square&color=brightgreen" alt="npm downloads"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/materna.svg?style=flat-square&color=green" alt="license"></a>&nbsp;
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/materna.svg?style=flat-square&color=orange" alt="node version"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/actions"><img src="https://img.shields.io/github/actions/workflow/status/shaonkabir8/materna/ci.yml?branch=main&style=flat-square" alt="CI status"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/stargazers"><img src="https://img.shields.io/github/stars/shaonkabir8/materna.svg?style=flat-square&color=yellow" alt="GitHub stars"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/network/members"><img src="https://img.shields.io/github/forks/shaonkabir8/materna.svg?style=flat-square" alt="GitHub forks"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/issues"><img src="https://img.shields.io/github/issues/shaonkabir8/materna.svg?style=flat-square" alt="GitHub issues"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/commits/main"><img src="https://img.shields.io/github/last-commit/shaonkabir8/materna.svg?style=flat-square" alt="last commit"></a>&nbsp;
  <a href="https://github.com/shaonkabir8/materna/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome"></a>&nbsp;
  <a href="https://github.com/sponsors/shaonkabir8"><img src="https://img.shields.io/github/sponsors/shaonkabir8?label=Sponsor&logo=GitHub&style=flat-square&color=ff69b4" alt="Sponsor"></a>
</p>

> **Node.js ve PostgreSQL için davranış tabanlı yerel ayar (locale) eşliği sondalaması.**  
> Sürüm numaralarını karşılaştırmayı bırakın. Gerçek sıralama (collation) davranışını karşılaştırmaya başlayın.

---

## İçindekiler

- [✨ Neden Materna?](#why-materna)
- [🚀 Öne çıkan özellikler](#feature-highlights)
- [📋 Gereksinimler](#requirements)
- [📦 Kurulum](#install)
- [⚡ Hızlı başlangıç](#quick-start)
- [📖 API referansı](#api-reference)
- [🧠 Tasarım notları](#design-notes)
- [⚠️ Sınırlamalar ve uyumluluk](#limitations-and-compatibility)
- [🛠 Geliştirme](#development)
- [💖 Destek ve sürekli bakım](#support-and-continuous-maintenance)
- [🤝 Katkıda bulunma](#contributing)
- [📄 Lisans](#license)

---

<a id="why-materna"></a>
## ✨ Neden Materna?

**Yerel ayar hataları sinsidir.** Veritabanınız `"ä"` karakterini Node.js çalışma zamanınızdan farklı sıralar. Sürüm dizeleri bunu size söylemez.

| Eski yöntem (sürüm üst verisi) | Yeni yöntem (davranışsal kanıt) |
| :--- | :--- |
| `process.versions.icu === '78.3'` kontrolünü yapıp uyumluluğu varsayarsınız. | `probeNode()` ve `probePostgres()` çalıştırıp **gerçekten gözlemlenen sıralamaları** karşılaştırırsınız. |
| Bir ICU veya glibc güncellemesi sıralamayı sessizce bozar. | Materna, *gerçek* sıralama çıktısının parmak izini SHA-256 ile alır. |
| Bunu ancak üretimde, `ORDER BY` uyuşmadığında öğrenirsiniz. | Test paketinizde, tam bir `first_difference` ile öğrenirsiniz. |
| "PostgreSQL 16 ve Node 22 kullanıyoruz, sorun olmamalı." | "Aynı `de-DE` derleminin birebir aynı sıralamaları ve eşitlik yapılarını ürettiğini kanıtladık." |

Materna **sürümleri üst veri**, **gözlemlenen davranışı ise kanıt** olarak ele alır. Bir uyuşmazlığı *yalnızca* aynı bildirilen sonda ve derlem üzerinde iki çalıştırma farklı gözlemlenen sıralamalar ürettiğinde bildirir.

---

<a id="feature-highlights"></a>
## 🚀 Öne çıkan özellikler

| **Yapılandırmasız sondalama** | **Veritabanı ve çalışma zamanı eşliği** | **Belirlenimci HTML raporları** |
| :--- | :--- | :--- |
| `npx materna node` anında çalışır. | Node.js `Intl.Collator` ve PostgreSQL `ORDER BY` yapılarını doğal olarak sondalar. | JavaScript içermeyen, incelenebilir ve diff alınabilir HTML üretir. |
| **E3/E1 kanıt düzeyleri** | **Katı çıkış kodları** | **Eşitlik yapısı farkında** |
| "Burada yürütüldü" ile "CI'da yapılandırıldı" arasını net biçimde ayırır. | CI dostu (0=PASS, 1=DIFFERENCE, 2=INCONCLUSIVE, 3=ERROR). | Yalnızca sırada değil, eşitlik gruplarındaki ince farkları da algılar. |
| **Tek çalışma zamanı bağımlılığı** | **Barındırılan kontrol düzlemi yok** | **Değişmez derlem** |
| `pg` dinamik olarak içe aktarılır; `import 'materna'` hiçbir veritabanı sürücüsü yüklemez. | Tamamen kendi makinenizde veya CI'da çalışır. SaaS yok. | Örnekler hash'lenir ve doğrulanır. Kurcalama reddedilir. |

---

<a id="requirements"></a>
## 📋 Gereksinimler

| Bileşen | Gereksinim |
| :--- | :--- |
| **Node.js** | `>=22` (CI'da 22, 24 ve 26 üzerinde yürütülür). |
| **PostgreSQL** | **İsteğe bağlı.** Yalnızca `materna postgres` çalıştırırsanız gerekir. Yerelde PostgreSQL 16.15 ile doğrulanmıştır. |
| **Çalışma zamanı** | Node, Bun, Deno. |

---

<a id="install"></a>
## 📦 Kurulum

```bash
# As a dependency
npm install materna

# As a one-off CLI
npx materna node
```

---

<a id="quick-start"></a>
## ⚡ Hızlı başlangıç

### 1. CLI (kod yazmadan)

```bash
# Probe Node.js runtime
npx materna node --json > node.json

# Probe PostgreSQL (DATABASE_URL is honored)
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/localeparity' \
  npx materna postgres --json > pg.json

# Compare the two observations
npx materna compare --left node.json --right pg.json
```

### 2. API (programatik)

```javascript
import { probeNode, probePostgres, compareObservations } from 'materna';

const left = probeNode({ locale: 'de-DE' });
const right = await probePostgres({ 
  locale: 'de-DE', 
  connectionString: process.env.DATABASE_URL 
});

const outcome = compareObservations(left, right);

if (outcome.status === 'DIFFERENCE') {
  console.error('Mismatch found at:', outcome.first_difference);
  process.exit(1);
}

if (outcome.status === 'INCONCLUSIVE') {
  throw new Error(outcome.reason);
}
```

### 3. HTML raporu

```bash
npx materna report --left node.json --right pg.json --out report.html
```

*Üretilen rapor JavaScript içermez. Her değer kaçışlanır (escape). Aynı girdiler bayt bayt aynı HTML üretir.*

---

<a id="api-reference"></a>
## 📖 API referansı

### `probeNode(options)`

Node.js `Intl.Collator` üzerine bir gözlemi eşzamanlı olarak döndürür.

- `options.locale` (string): örn. `'de-DE'`.
- `options.sensitivity` (string): `'base'`, `'accent'`, `'case'` veya `'variant'`.
- `options.numeric` (boolean): sayısal sıralama.
- `options.corpus` (array): özel örnekler (varsayılan olarak değişmez 16 örnekli çekirdek).

### `probePostgres(options)`

PostgreSQL `ORDER BY` yapısını eşzamansız olarak sondalar.

- `options.connectionString`: PostgreSQL URL'si.
- `options.collation` (string): örn. `'en-US-x-icu'`. Parametreli sorgu ile çözülür; bilinmeyen adlar hata verir (sessiz geri dönüş yok).
- Diğer seçenekler `probeNode` ile aynıdır.

### `compareObservations(left, right, [opts])`

Bir sonuç nesnesi döndürür:

- `status`: `'PASS'`, `'DIFFERENCE'` veya `'INCONCLUSIVE'`.
- `first_difference`: sıralamaların ayrıldığı tam dizin ve değerler.
- `metadata_differences`: hataya **neden olmayan** ortam farklarının dizisi (örn. ICU sürümü).

### Çıkış kodları

| Kod | Durum | Anlamı |
| :--- | :--- | :--- |
| `0` | `PASS` | Parmak izleri eşleşiyor. |
| `1` | `DIFFERENCE` | Parmak izleri farklı; ilk fark yazdırılır. |
| `2` | `INCONCLUSIVE` | Kanıt eksik, yerel ayar desteklenmiyor veya girdi okunamıyor. |
| `3` | `ERROR` | Bozuk JSON, hatalı argümanlar, güvensiz tanımlayıcı veya sürücü hatası. |

---

<a id="design-notes"></a>
## 🧠 Tasarım notları

- **Tahmin yerine parmak izi**: `result_hash`, `{ order, ties }` yapısının kurallı JSON'u üzerinden SHA-256'dır. Eşitlikler dâhil edilir, çünkü iki çalışma zamanı sırada anlaşıp *hangi değerlerin eşit olduğu* konusunda ayrışabilir.
- **Kendi kendisiyle çelişme reddedilir**: `order` alanı derleminin bir yeniden sıralaması olmayan ya da bildirilen hash'i uyuşmayan bir gözlem, `INCONCLUSIVE` (veya `ERROR`) sayılır; asla kanıt sayılmaz.
- **Üst veri hata değildir**: Node ICU 78, PostgreSQL ise glibc kullanıyorsa ama ikisi de aynı sırayı ve aynı eşitlik yapısını üretiyorsa sonuç `PASS`'tir.
- **Rapor değişmezleri**: `report.status`, `outcome.status` ile eşit olmalıdır. `first_difference` taşıyan bir `PASS` reddedilir.

---

<a id="limitations-and-compatibility"></a>
## ⚠️ Sınırlamalar ve uyumluluk

### Uyumluluk matrisi

| Yüzey | Doğrulanan | Kanıt düzeyi |
| :--- | :--- | :--- |
| **Node.js 22.23.5, Linux x86_64, ICU 78.3** | Tam takım, 98/98 | **E3** — burada yürütüldü |
| **Node.js 24.22.3, Linux x86_64** | Tam takım, 98/98 | **E3** — burada yürütüldü |
| **PostgreSQL 16.15, Linux x86_64** | 11 canlı test dâhil tam takım, 98/98 | **E3** — burada yürütüldü |
| **PostgreSQL 14, Linux x86_64** | `ci.yml` içinde yapılandırıldı | **E1** — hiç geçtiği gözlemlenmedi |
| **macOS / Windows** | Yürütülmedi | DOĞRULANMADI |
| **MySQL / SQLite / tarayıcılar** | Uygulanmadı | — |

### Sınırlamalar

- **Yalnızca iki sonda**: Node.js ve PostgreSQL. MySQL ve SQLite uygulanmamıştır.
- **Bütünlük ≠ özgünlük**: Materna tutarlılığı denetler, kökeni değil. Gözlemleri imzalamaz.
- **Küçük derlem**: Kapsamlı CLDR kapsamı değil, 16 hedefli örnek.
- **Varsayılan sıralama**: `PG_COLLATION` ayarlanmadıkça PostgreSQL varsayılan olarak `C.UTF-8` kullanır. Bu yapılandırmada Node'un ICU'suna karşı bir `DIFFERENCE` beklenen bir sonuçtur.

---

<a id="development"></a>
## 🛠 Geliştirme

```bash
git clone https://github.com/shaonkabir8/materna.git
cd materna
npm install
npm test
```

**CI şunlarda çalışır:** Node `22`, `24`, `26` × PostgreSQL `14`, `16`. TAP özeti, herhangi bir test **atlanırsa** başarısız olacak şekilde ayarlanmıştır (`# skipped 0` veya `ℹ skipped 0`). Yeşil bir işlem hattı, her şeyin gerçekten çalıştığı anlamına gelir.

---

<a id="support-and-continuous-maintenance"></a>
## 💖 Destek ve sürekli bakım

**Materna %100 bağımsız bir açık kaynak projesidir.** Bu paketi güvenilir ve 7/24 aktif bakımlı tutabilmek için topluluğun desteğine dayanıyoruz.

Materna sizi yerel ayar kaynaklı üretim hatalarından koruyorsa, lütfen sürekli geliştirmeyi desteklemeyi düşünün:

### 💰 Finansal destek (fonlama ve bağışlar)

Sürekli fonlama, bakımcının kesintisiz bakıma, hızlı hata düzeltmelerine ve uyumluluk matrisini genişletmeye zaman ayırmasını sağlar.

- **[GitHub'da sponsor olun](https://github.com/sponsors/shaonkabir8)** (düzenli veya tek seferlik)
- **[Bir kahve ısmarlayın](https://buymeacoffee.com/shaonkabir8)** (hızlı bağış)

*Kurumsal sponsorluklar çok değerlidir. Kurumsal destek veya özel SLA'lar için lütfen doğrudan GitHub üzerinden iletişime geçin.*

### 👨‍💻 Kod katkıları

Her zaman tutkulu programcılar arıyoruz! İster yeni sondalar eklemek (MySQL/SQLite gibi), ister test derlemini genişletmek, HTML raporlayıcıyı iyileştirmek ya da hata düzeltmek olsun; pull request'leriniz çok memnuniyetle karşılanır.

- [Açık konulara](https://github.com/shaonkabir8/materna/issues) göz atın veya fikirleri tartışmak için yeni bir konu açın.
- Değişiklikleri küçük tutun, bir davranış testi ekleyin ve **gözlemlemediğiniz bir sonucu iddia etmeyin**.

---

<a id="contributing"></a>
## 🤝 Katkıda bulunma

Diğer çalışma zamanları (MySQL, SQLite) için bağdaştırıcılar, daha büyük bir derlem ve daha zengin raporlayıcılar memnuniyetle karşılanır. Değişiklikleri küçük tutun, bir davranış testi ekleyin ve **gözlemlemediğiniz bir sonucu iddia etmeyin**.

---

<a id="license"></a>
## 📄 Lisans

MIT — bkz. [LICENSE](https://github.com/shaonkabir8/materna/blob/main/LICENSE).

[Codazi](https://github.com/codazi) tarafından geliştirildi ve sürdürülüyor · Bakımcı: [shaonkabir8](https://github.com/shaonkabir8).
