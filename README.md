# Kronwacht

Ein kleines 2D-Fantasy-Reich fürs Handy. Tippen zum Laufen, Kämpfen, Aufträge, Beutel. Der Fortschritt bleibt lokal im Browser, ohne Konto.

## Spielen

Öffne das Spiel direkt im Browser:

https://cdn.jsdelivr.net/gh/Cuddlerandom/kronwacht@gh-pages/index.html

Der Fortschritt bleibt auf diesem Handy. Das GitHub-Repo ist der Quellcode.

## Starten

```bash
npm install
npm run dev
```

Die App läuft dann auf Port 8080.

## Wo du etwas änderst

| Was | Datei |
| --- | --- |
| Karte, Wege, Gegner, Kräuter | `src/game/world.ts` |
| Gegenstände, Zauber, Aufträge, Texte | `src/game/content.ts` |
| Kampf, Bewegung, Speichern | `src/game/engine.ts` |
| Zeichnen der Welt | `src/game/render.ts` |
| Tasten, Leiste, Fenster | `src/components/GameScreen.tsx` |
| Farben und Handy-Layout | `src/styles.css` |
| Figuren und Kacheln | `public/game/` |

Drei Wege: **Klinge**, **Flamme**, **Licht**. Die Zone heißt Lindenhain.
