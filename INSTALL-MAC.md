# DB Tool — ინსტალაცია macOS-ზე (Apple Silicon)

## ნაბიჯი 1: DMG ფაილის გადატანა

`DBTool-0.1.0-arm64-mac.dmg` ფაილი გადაიტანე MacBook Air-ზე (AirDrop, USB, Google Drive, ან ნებისმიერი სხვა გზით).

## ნაბიჯი 2: DMG-ის გახსნა

ორჯერ დააკლიკე `DBTool-0.1.0-arm64-mac.dmg` ფაილს. გაიხსნება ფანჯარა სადაც ნახავ:
- **DB Tool** (აპლიკაციის აიქონი)
- **Applications** ფოლდერი

**DB Tool** აიქონი გადაიტანე **Applications** ფოლდერზე (drag & drop).

## ნაბიჯი 3: პირველი გაშვება

რადგან აპი unsigned-ია (Apple Developer სერტიფიკატის გარეშე), macOS პირდაპირ არ გახსნის. ამის გვერდის ასავლელად:

1. გახსენი **Finder → Applications**
2. იპოვე **DB Tool**
3. **Right-click** (ან Control + click) → **Open**
4. გამოვა გაფრთხილება: *"Apple cannot check it for malicious software"*
5. დააჭირე **Open**

> პირველი გაშვების შემდეგ აპი ჩვეულებრივ გაიხსნება ორმაგი კლიკით, აღარ მოითხოვს ამ პროცედურას.

## ნაბიჯი 4: თუ "Open" ღილაკი არ ჩანს

თუ მხოლოდ "Move to Trash" ჩანს:

1. გახსენი **System Settings → Privacy & Security**
2. გადაახვიე ქვემოთ — დაინახავ: *"DB Tool" was blocked from use because it is not from an identified developer*
3. დააჭირე **Open Anyway**
4. შეიყვანე Mac-ის პაროლი
5. თავიდან გახსენი აპი

## ნაბიჯი 5: გამოყენება

აპი გაიხსნება Connection Manager-ით. სამი default კონექშენი ჩანს:

| კონექშენი | რა სჭირდება |
|---|---|
| **Local SQLite** | არაფერი — ფაილზე მუშაობს, მზადაა გამოსაყენებლად |
| **Local Postgres** | PostgreSQL სერვერი localhost:5432-ზე |
| **Local MySQL** | MySQL სერვერი localhost:3306-ზე |

SQLite-ს ტესტირებისთვის სერვერი არ სჭირდება — **Connect** დააჭირე და მუშაობს.

Postgres/MySQL-ისთვის შესაბამისი სერვერები უნდა იყოს გაშვებული (Docker ან ლოკალურად დაყენებული). კონექშენის პარამეტრების შეცვლა (host, port, user, password) შეგიძლია **Edit** ღილაკით.

## DMG-ის გამორთვა

ინსტალაციის შემდეგ DMG-ის eject შეგიძლია: Finder-ში Desktop-ზე ან sidebar-ში **DB Tool 0.1.0-arm64** — დააჭირე ⏏ (eject) ღილაკს.
