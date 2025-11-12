# 📱 Instrukcja instalacji panelu pracownika jako aplikacja mobilna (PWA)

Panel pracownika można zainstalować na telefonie lub tablecie jako pełnoprawną aplikację mobilną, dzięki technologii Progressive Web App (PWA).

## 🎯 Korzyści z instalacji jako aplikacja:

- ✅ **Dostęp jak do natywnej aplikacji** - ikona na ekranie głównym
- ✅ **Działa offline** - podstawowa funkcjonalność nawet bez internetu
- ✅ **Pełny ekran** - bez paska przeglądarki
- ✅ **Szybki start** - uruchamia się jak zwykła aplikacja
- ✅ **Powiadomienia push** - możliwość otrzymywania alertów

---

## 📲 Instrukcja dla urządzeń Android (Chrome, Edge, Samsung Internet)

### Krok 1: Otwórz panel pracownika w przeglądarce
1. Otwórz przeglądarkę Chrome, Edge lub Samsung Internet
2. Wejdź na adres: https://promocjaadezo-sudo.github.io/doors-planner/worker-app-v2.html

### Krok 2: Zainstaluj aplikację
**METODA A - Przez menu przeglądarki:**
1. Dotknij ikonę **trzech kropek** (⋮) w prawym górnym rogu
2. Wybierz opcję **"Dodaj do ekranu głównego"** lub **"Zainstaluj aplikację"**
3. Pojawi się okno - potwierdź przyciskiem **"Dodaj"** lub **"Zainstaluj"**
4. Aplikacja pojawi się na ekranie głównym

**METODA B - Przez banner instalacyjny:**
1. Na dole ekranu może pojawić się banner z komunikatem "Dodaj panel pracownika do ekranu głównego"
2. Dotknij przycisk **"Dodaj"**
3. Potwierdź instalację

### Krok 3: Uruchom aplikację
1. Na ekranie głównym znajdź ikonę **"Panel pracownika"** 👷
2. Dotknij ikony - aplikacja uruchomi się w trybie pełnoekranowym

---

## 🍎 Instrukcja dla urządzeń iOS (iPhone, iPad - Safari)

### Krok 1: Otwórz panel pracownika w Safari
1. Otwórz przeglądarkę **Safari** (inne przeglądarki nie obsługują PWA na iOS!)
2. Wejdź na adres: https://promocjaadezo-sudo.github.io/doors-planner/worker-app-v2.html

### Krok 2: Dodaj do ekranu głównego
1. Dotknij ikonę **"Udostępnij"** (□↑) na dolnym pasku (iPhone) lub górnym (iPad)
2. Przewiń listę opcji i wybierz **"Dodaj do ekranu początkowego"**
3. Możesz zmienić nazwę aplikacji (domyślnie: "Panel pracownika")
4. Dotknij **"Dodaj"** w prawym górnym rogu

### Krok 3: Uruchom aplikację
1. Na ekranie głównym znajdź ikonę **"Panel pracownika"** 👷
2. Dotknij ikony - aplikacja uruchomi się jak natywna

---

## 🔧 Rozwiązywanie problemów

### Nie widzę opcji "Dodaj do ekranu głównego"
- **Android:** Upewnij się, że używasz przeglądarki Chrome, Edge lub Samsung Internet (najnowsza wersja)
- **iOS:** Musisz używać przeglądarki Safari - inne przeglądarki nie obsługują tej funkcji
- Spróbuj odświeżyć stronę (przeciągnij palcem od góry w dół)

### Aplikacja nie działa offline
- PWA wymaga pierwszego uruchomienia z internetem
- Po pierwszym załadowaniu podstawowe funkcje będą działać offline
- Synchronizacja danych wymaga połączenia internetowego

### Ikona aplikacji się nie pojawia
- **Android:** Sprawdź wszystkie ekrany główne i szuflady aplikacji
- **iOS:** Sprawdź kolejne ekrany główne (przesuń palcem w lewo)
- Spróbuj ponownie zainstalować aplikację

### Jak zaktualizować aplikację?
- **Android:** Aplikacja aktualizuje się automatycznie przy każdym uruchomieniu z internetem
- **iOS:** Otwórz aplikację - zaktualizuje się automatycznie
- Możesz też odinstalować i zainstalować ponownie

### Jak odinstalować aplikację?
- **Android:** Przytrzymaj ikonę → "Odinstaluj" lub "Usuń"
- **iOS:** Przytrzymaj ikonę → kliknij (x) lub "Usuń aplikację"

---

## 💡 Wskazówki dla administratorów

### Testowanie PWA
1. Otwórz narzędzia deweloperskie (F12)
2. Przejdź do zakładki "Lighthouse"
3. Uruchom audyt PWA
4. Sprawdź czy wszystkie kryteria są spełnione

### Wymagania techniczne PWA
✅ **Spełnione w worker-app-v2.html:**
- Manifest PWA (meta tagi w `<head>`)
- HTTPS (wymagane przez GitHub Pages)
- Service Worker (cache offline)
- Ikony aplikacji (emoji 👷)
- Viewport meta tag
- Theme color

### Dalszy rozwój PWA
Możliwe rozszerzenia:
- Dedykowane ikony aplikacji (PNG 192x192, 512x512)
- Service Worker z bardziej zaawansowanym cache
- Powiadomienia push dla nowych zadań
- Background sync dla offline changes
- Splash screen przy starcie

---

## 📞 Wsparcie techniczne

Jeśli masz problemy z instalacją:
1. Upewnij się, że używasz najnowszej wersji przeglądarki
2. Sprawdź połączenie internetowe
3. Wyczyść cache przeglądarki
4. Spróbuj ponownie od początku

**URL panelu pracownika:**  
https://promocjaadezo-sudo.github.io/doors-planner/worker-app-v2.html

---

*Ostatnia aktualizacja: 2025-11-09*
*Wersja dokumentu: 1.0*
