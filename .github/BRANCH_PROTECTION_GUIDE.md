# 🛡️ Branch Protection Rules - Rekomendacje

## 📋 Zalecane ustawienia dla branch `main`

### 1. ✅ Require status checks to pass before merging

**Status checks wymagane:**
```
✅ unit-tests / unit-tests (18.x)
✅ unit-tests / unit-tests (20.x)
✅ unit-tests / unit-tests (22.x)
✅ unit-tests / coverage-check
✅ unit-tests / quality-gates
```

**Konfiguracja:**
- Settings → Branches → Add rule
- Branch name pattern: `main`
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- Wybierz status checks: `unit-tests`

---

### 2. ✅ Require pull request reviews before merging

**Ustawienia:**
- Required approving reviews: **1**
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require review from Code Owners (opcjonalnie)

---

### 3. ✅ Require conversation resolution before merging

**Ustawienia:**
- ✅ All conversations must be resolved

---

### 4. ✅ Require linear history

**Ustawienia:**
- ✅ Require linear history (zalecane dla czystej historii)

---

### 5. ✅ Include administrators

**Ustawienia:**
- ✅ Include administrators (nawet admini muszą przejść przez checks)

---

## 📸 Konfiguracja krok po kroku

### Krok 1: Przejdź do Settings
```
Repository → Settings → Branches → Add rule
```

### Krok 2: Ustaw branch name pattern
```
Branch name pattern: main
```

### Krok 3: Włącz wymagane opcje
```
✅ Require a pull request before merging
   ├─ Required approving reviews: 1
   └─ ✅ Dismiss stale pull request approvals

✅ Require status checks to pass before merging
   ├─ ✅ Require branches to be up to date
   └─ Status checks:
       ├─ unit-tests / unit-tests (18.x)
       ├─ unit-tests / unit-tests (20.x)
       ├─ unit-tests / unit-tests (22.x)
       ├─ unit-tests / coverage-check
       └─ unit-tests / quality-gates

✅ Require conversation resolution before merging
✅ Require linear history
✅ Include administrators
```

### Krok 4: Zapisz regułę
```
Create / Save changes
```

---

## 🎯 Co to daje?

### ✅ Blokada merge przy:
- ❌ Nieudanych testach jednostkowych
- ❌ Spadku pokrycia kodu poniżej 100%
- ❌ Nierozwiązanych komentarzach w PR
- ❌ Braku approvals od reviewerów
- ❌ Nieaktualnej gałęzi (nie zsynchronizowana z main)

### ✅ Wymuszone dobre praktyki:
- 🔍 Code review zawsze wymagany
- 🧪 Testy zawsze uruchamiane
- 📊 Quality gates zawsze sprawdzane
- 🚀 Tylko working code może trafić do main

---

## 📊 Przykładowy flow z protection rules

### Scenariusz 1: ✅ Wszystko OK
```
Developer:
1. Tworzy branch feature/new-feature
2. Commituje zmiany
3. Tworzy PR do main

GitHub:
4. 🔄 Uruchamia unit-tests workflow
   ├─ ✅ Node 18.x: 31/31 passed
   ├─ ✅ Node 20.x: 31/31 passed
   └─ ✅ Node 22.x: 31/31 passed
5. ✅ Coverage check: 100%
6. ✅ Quality gates: PASSED

Reviewer:
7. 👀 Przegląda kod
8. ✅ Approves PR

GitHub:
9. 🟢 Merge button enabled
10. ✅ Merge allowed
```

### Scenariusz 2: ❌ Test failuje
```
Developer:
1. Tworzy branch feature/broken-feature
2. Commituje zmiany (błąd w kodzie)
3. Tworzy PR do main

GitHub:
4. 🔄 Uruchamia unit-tests workflow
   ├─ ❌ Node 18.x: 30/31 failed
   ├─ ❌ Node 20.x: 30/31 failed
   └─ ❌ Node 22.x: 30/31 failed
5. ❌ Quality gates: FAILED

Reviewer:
6. 👀 Widzi czerwone status checks
7. ❌ Cannot approve (tests failed)

GitHub:
8. 🔴 Merge button DISABLED
9. ❌ Merge blocked

Developer:
10. 🔧 Fixuje błąd
11. Push poprawki
12. 🔄 Tests re-run automatically
13. ✅ All tests pass now
14. 🟢 Merge enabled
```

---

## 🔒 Dodatkowe zabezpieczenia (opcjonalnie)

### 1. CODEOWNERS file
```
# .github/CODEOWNERS
state/**/*.js @your-team-name
state/tests/** @your-team-name @senior-dev
.github/workflows/** @devops-team
```

### 2. Required signatures
```
Settings → Branches → Require signed commits
```
- Wymaga GPG signed commits
- Zwiększa bezpieczeństwo

### 3. Restrict pushes
```
Settings → Branches → Restrict who can push to matching branches
```
- Tylko wybrani członkowie mogą pushować do main

---

## 📝 Checklist wdrożenia

```markdown
- [ ] Utworzono branch protection rule dla `main`
- [ ] Włączono wymagane status checks (5 checks)
- [ ] Ustawiono required reviews (minimum 1)
- [ ] Włączono conversation resolution
- [ ] Włączono linear history
- [ ] Include administrators
- [ ] (Opcjonalnie) Utworzono CODEOWNERS
- [ ] (Opcjonalnie) Włączono signed commits
- [ ] Przetestowano flow - utworzono testowy PR
- [ ] Zweryfikowano że merge blokowany przy failed tests
- [ ] Zweryfikowano że merge enabled przy passed tests
```

---

## 🎓 Best Practices

### ✅ DO:
- ✅ Zawsze twórz PR, nawet dla małych zmian
- ✅ Poczekaj aż wszystkie checks przejdą
- ✅ Rozwiązuj wszystkie komentarze przed merge
- ✅ Aktualizuj branch przed merge (rebase/merge z main)
- ✅ Pisz dobre commit messages

### ❌ DON'T:
- ❌ Nie force-push do main (zablokowane)
- ❌ Nie merge bez approvals (zablokowane)
- ❌ Nie merge z failed tests (zablokowane)
- ❌ Nie merge z nierozwiązanymi komentarzami (zablokowane)
- ❌ Nie używaj "Admin override" bez uzasadnienia

---

## 🚨 Emergency procedures

### Gdy musisz szybko wdrożyć hotfix:

#### Opcja 1: Disable protection temporarily (NOT RECOMMENDED)
```
Settings → Branches → Edit rule → Temporarily disable
```
- ⚠️ Tylko w absolutnie krytycznych sytuacjach
- ⚠️ Re-enable natychmiast po merge

#### Opcja 2: Fast-track PR (RECOMMENDED)
```
1. Utwórz branch hotfix/critical-issue
2. Fix issue
3. Commit + Push
4. Create PR with label: HOTFIX
5. Poczekaj na testy (~1 min)
6. Request urgent review
7. Merge gdy tests pass + 1 approval
```

---

## 📊 Monitoring

### Gdzie sprawdzić status protection rules?

#### **Insights → Security**
```
Security → Branch protection rules
```

#### **Settings → Branches**
```
Settings → Branches → Rule status
```

#### **PR Interface**
```
Pull Request → Checks tab
```
- ✅ Zielone checkmarki = wszystko OK
- ❌ Czerwone X = coś failuje
- 🟡 Żółty pending = w trakcie

---

## 🔗 Przydatne linki

- [GitHub Docs: Branch protection rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [GitHub Docs: CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [GitHub Docs: Required status checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)

---

**Status:** 📘 Instrukcja  
**Data:** 2 listopada 2025  
**Wersja:** 1.0.0

💡 **Tip:** Regularne review protection rules (co 3 miesiące) aby upewnić się że są aktualne!
