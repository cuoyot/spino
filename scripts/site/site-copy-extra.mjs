// Authored website copy for the German and Hungarian launch.
import {extraCopy} from '../../src/companion/locale-extra.js';
export function newLanguageCopy(english) {
 const descriptions={
 de:[
 'Übe Notenlesen und Technik mit einer oder beiden Händen. Wähle ein Tempo oder übe ohne Zeitdruck. Rhythmus und Tonumfang richten sich nach deiner Klavierstufe.',
 'Beginne auf Wunsch mit wechselnden Hanon-Übungen. Schrittweise Handdarstellungen begleiten das Aufwärmen.',
 'Ein kompatibles USB- oder Bluetooth-MIDI-Keyboard prüft unterstützte Noten und Akkorde. Am akustischen Klavier erfasst du deine Übung manuell. Pedale können umblättern; unterstützte MusicXML-Passagen lassen sich mit MIDI verfolgen.',
 'Erstelle Übungsabschnitte, ändere ihre Reihenfolge und lege ihre Dauer fest. Plane gespeicherte Routinen im Kalender und wähle dein Tempo beim Üben.',
 'Lege Stücke aufs Notenpult, importiere PDF und MusicXML und entdecke den Katalog. Ergänze PDF-Anmerkungen und MusicXML-Fingersätze, speichere Ausschnitte und drucke Noten. Die lokale PDF-Erkennung kann Titel, Komponist und Tempo vorschlagen.',
 'Ein Tippen startet die Bildschirmübung: ohne Tempo, mit einer Hand sowie zufälligem Notenschlüssel und Tastaturbereich. Sammle Punkte für Genauigkeit und Geschwindigkeit.',
 'Übe frei mit akustischem, visuellem oder kombiniertem Metronom. Nutze Tempo- und Lautstärkeregler, Tap-Tempo und gespeicherte Lieblingstempi.',
 'Sieh gespeicherte Einheiten, Werkverläufe, Rückmeldungen und Wochenziele. Ein 12-Wochen-Diagramm und Filter zeigen deine Übungszeit. Korrigiere Zeiten und Abschnitte abgeschlossener Übungen. Nach genügend vergleichbaren Abschnitten lässt sich die Antwortgenauigkeit vergleichen.',
 'Nimm Audio oder Video zu einem Repertoirestück auf. Prüfe und teile Aufnahmen unter Bibliothek → Multimedia. Lokale Dateien funktionieren offline. Android 6.1 kopiert Aufnahmen über dein eigenes Google Drive; JSON-Sicherungen enthalten keine Audio- oder Videodateien.',
 'Wechsle zwischen Woche und Monat, plane Routinen und wiederkehrende Unterrichtsstunden oder Termine. Ergänze Rückmeldungen und Aufnahmen der Lehrkraft. Unterstützte Geräte können dich vorher erinnern.',
 'Exportiere JSON-Sicherungen mit Noten und Anmerkungen. Android 6.1 synchronisiert das Übungsheft und Aufnahmekopien über dein Google-Konto. Wähle auf beiden Geräten dasselbe Konto und Übungsheft. Lokales Speichern und Wiederherstellen bleiben verfügbar.',
 'Wähle Deutsch, Ungarisch, Englisch, Spanisch oder Katalanisch, ein helles oder dunkles Design sowie deine Klavierstufe und Übungseinstellungen. Übe ohne Klavier am Bildschirm oder offline mit deinen gespeicherten Noten.'
 ],
 hu:[
 'Gyakorolj kottaolvasást és technikát egy vagy két kézzel. Válassz tempót, vagy gyakorolj időnyomás nélkül. A ritmus és a hangterjedelem a zongoratudásszintedhez igazodik.',
 'Kezdd a gyakorlást választható, váltakozó Hanon-gyakorlatokkal. Lépésenkénti kéztartásábrák segítik a bemelegítést.',
 'A kompatibilis USB- vagy Bluetooth-MIDI-billentyűzet ellenőrzi a támogatott hangokat és akkordokat. Akusztikus zongorán kézzel követheted a gyakorlást. Pedállal lapozhatsz, és MIDI-vel követheted a támogatott MusicXML-részleteket.',
 'Hozz létre gyakorlási szakaszokat, rendezd át őket, és állítsd be az idejüket. A mentett terveket a naptárból ütemezheted, a tempót gyakorláskor választhatod ki.',
 'Helyezd a darabokat a kottatartóra, importálj PDF-et és MusicXML-t, és böngéssz a katalógusban. Jegyzetelj PDF-re, adj ujjrendet a MusicXML-hangokhoz, ments kivágást és nyomtass. A helyi PDF-felismerés címet, zeneszerzőt és tempót javasolhat.',
 'Egy érintéssel indul a képernyős gyakorlás: tempó nélkül, egy kézzel, véletlen kulccsal és billentyűzettartománnyal. Szerezz pontot a pontosságért és gyorsaságért.',
 'Gyakorolj szabadon hangos, vizuális vagy kombinált metronómmal. Használj tempó- és hangerőszabályzót, koppintásos tempót és mentett kedvenceket.',
 'Tekintsd át a mentett gyakorlásokat, a művek előzményeit, a visszajelzéseket és a heti célokat. A 12 hetes diagram és a szűrők megmutatják az idődet. Javíthatod a befejezett gyakorlások idejét és szakaszait. Elegendő összevethető szakasz után a válaszpontosság is összehasonlítható.',
 'Rögzíts hangot vagy videót egy repertoárdarabhoz. Ellenőrizd és oszd meg a felvételeket a Könyvtár → Multimédia alatt. A helyi fájlok offline is lejátszhatók. Az Android 6.1 a saját Google Drive-odon másolja a felvételeket; a JSON-mentések nem tartalmaznak hang- és videófájlokat.',
 'Válts heti és havi nézet között, tervezz gyakorlásokat és ismétlődő órákat vagy eseményeket. Adj visszajelzést és tanári felvételt az órákhoz. A támogatott eszközök előre emlékeztethetnek.',
 'Exportálj JSON-mentést kottákkal és jegyzetekkel. Az Android 6.1 a Google-fiókoddal szinkronizálja a naplót és a felvételeket. Mindkét eszközön ugyanazt a fiókot és naplót válaszd. A helyi mentés és visszaállítás továbbra is elérhető.',
 'Válassz magyar, német, angol, spanyol vagy katalán nyelvet, világos vagy sötét témát, tudásszintet és gyakorlási beállításokat. Gyakorolj zongora nélkül a képernyőn, vagy offline a mentett kottáiddal.'
 ]};
 const details={
 de:{title:'SPino: Kostenlose Klavierübungs-App für Android',description:'Plane dein Klavierüben, kommentiere PDF- und MusicXML-Noten, übe Notenlesen mit MIDI und verfolge deinen Fortschritt. Kostenlos und werbefrei.',lead:'SPino ist dein kostenloses Klavierübungsheft für Android. Plane Routinen, bewahre Noten mit Anmerkungen auf und verfolge deinen Fortschritt. Übe am akustischen Klavier, mit einem kompatiblen MIDI-Keyboard oder am Bildschirm.',hanonDescription:'Sieh, wie sich beide Hände vorbereiten, spielen und über die Tastatur bewegen — mit Klavierklang und verschiedenen Blickwinkeln.',hanonCaption:'Handführung im Überblick · Ausschnitte aus Hanon 1–10 · 87 Sekunden',shotsNote:'Responsive Browser-Vorschau des aktuellen Quellstands mit synthetischen Übungsheften und Demo-Audio. Diese Bilder sind keine Abnahme auf einem nativen Gerät. Die veröffentlichten Versionen stehen unter Downloads.',privacy:'Kein SPino-Konto, keine Werbung und kein von SPino betriebener Server. Ohne Google-Drive-Verbindung bleiben deine Daten lokal. Android 6.1 kann Übungsheft und Aufnahmen über dein eigenes Google-Konto synchronisieren. Der Entwickler erhält weder Übungshefte noch Aufnahmen oder Google-Zugangsdaten. JSON-Kopien enthalten keine Audio- oder Videodateien.',faq:[
 ['Ist SPino kostenlos?','Ja. SPino ist kostenlos, werbefrei und benötigt kein SPino-Konto. Der eigene Anwendungscode ist unter GNU GPL Version 3 oder neuer verfügbar.'],
 ['Kann ich offline üben?','Ja. Gespeicherte Noten, Übungsheft und lokale Aufnahmen funktionieren offline. Katalogdownloads und Google-Drive-Synchronisierung benötigen Internet.'],
 ['Brauche ich ein Digitalpiano oder MIDI-Keyboard?','Nein. Du kannst am akustischen Klavier üben und Einheiten manuell erfassen oder die Bildschirmtastatur nutzen. Ein kompatibles USB- oder Bluetooth-MIDI-Keyboard prüft unterstützte Noten und Akkorde.'],
 ['Kann ich Noten importieren und kommentieren?','Ja. SPino importiert PDF und MusicXML. Ergänze PDF-Anmerkungen und MusicXML-Fingersätze, speichere Seitenausschnitte und drucke deine Noten.'],
 ['Wie hilft SPino beim Planen?','Erstelle Routinen mit zeitlich festgelegten Abschnitten und plane Übungen und Unterricht im Kalender. Verfolge gespeicherte Einheiten, Werkverläufe und Wochenziele. Notenlesen, Technik, Hanon und Metronom begleiten dein Üben.'],
 ['Kann ich mein Übungsheft zwischen Geräten synchronisieren?','Android 6.1 synchronisiert Übungsheft und gespeicherte Aufnahmen über dein Google Drive. Wähle dasselbe Google-Konto und das vorhandene Übungsheft auf jedem Gerät. JSON-Sicherungen enthalten Noten und Anmerkungen, aber keine Audio- oder Videodateien.'],
 ['Welche Android-Version soll ich herunterladen?','Installiere die stabile Version aus Google Play. Das Beta-APK ist für das Ausprobieren von Funktionen in Entwicklung vorgesehen.']
 ]},
 hu:{title:'SPino: Ingyenes zongoragyakorló alkalmazás Androidra',description:'Tervezd meg a zongoragyakorlást, jegyzetelj PDF- és MusicXML-kottákra, gyakorolj kottaolvasást MIDI-vel, és kövesd a fejlődésedet. Ingyenes és reklámmentes.',lead:'A SPino ingyenes zongoragyakorló naplód Androidra. Tervezz gyakorlásokat, őrizd meg kottáidat és jegyzeteidet, és kövesd a fejlődésedet. Használhatsz akusztikus zongorát, kompatibilis MIDI-billentyűzetet vagy képernyős billentyűzetet.',hanonDescription:'Nézd meg, hogyan készül fel, játszik és mozog mindkét kéz a billentyűzeten, zongorahang kíséretében, több nézőpontból.',hanonCaption:'Kézvezetési bemutató · részletek a Hanon 1–10-ből · 87 másodperc',shotsNote:'Reszponzív böngészős előnézet a jelenlegi forrásból, mesterséges gyakorlónaplóval és bemutatóhanggal. A képek nem natív eszközös átvételi tesztek. A kiadott verziókat a letöltéseknél találod.',privacy:'Nincs SPino-fiók, reklám vagy SPino által működtetett szerver. Google Drive-kapcsolat nélkül az adatok helyben maradnak. Az Android 6.1 a saját Google-fiókoddal szinkronizálhatja a naplót és a felvételeket. A fejlesztő nem kap naplót, felvételt vagy Google-hitelesítő adatot. A JSON-másolatok nem tartalmaznak hang- és videófájlokat.',faq:[
 ['Ingyenes a SPino?','Igen. A SPino ingyenes, reklámmentes, és nem igényel SPino-fiókot. Saját alkalmazáskódja a GNU GPL 3. vagy újabb verziója alatt érhető el.'],
 ['Gyakorolhatok internet nélkül?','Igen. A mentett kották, a napló és a helyi felvételek offline is működnek. A katalógusletöltésekhez és a Google Drive-szinkronizáláshoz internet kell.'],
 ['Szükséges digitális zongora vagy MIDI-billentyűzet?','Nem. Akusztikus zongorán kézzel követheted a gyakorlást, vagy használhatod a képernyős billentyűzetet. Kompatibilis USB- vagy Bluetooth-MIDI-billentyűzet ellenőrizheti a támogatott hangokat és akkordokat.'],
 ['Importálhatok és jegyzetelhetek kottát?','Igen. A SPino PDF-et és MusicXML-t importál. Jegyzetelhetsz a PDF-re, ujjrendet adhatsz a MusicXML-hangokhoz, kivágást menthetsz és kottát nyomtathatsz.'],
 ['Hogyan segít a SPino a tervezésben?','Állíts össze időzített szakaszokból terveket, és ütemezz gyakorlásokat, órákat a naptárban. Kövesd a mentett gyakorlásokat, a művek előzményeit és a heti célokat. Kottaolvasás, technika, Hanon és metronóm segíti a munkádat.'],
 ['Szinkronizálhatom a naplómat az eszközeim között?','Az Android 6.1 a saját Google Drive-odon szinkronizálja a naplót és a mentett felvételeket. Minden eszközön ugyanazt a Google-fiókot és meglévő naplót válaszd. A JSON-mentések kottát és jegyzetet tartalmaznak, hangot és videót nem.'],
 ['Melyik Android-verziót töltsem le?','A stabil verziót a Google Play-ről telepítsd. A béta APK a fejlesztés alatt álló funkciók kipróbálására szolgál.']
 ]}
 };
 return Object.fromEntries(['de','hu'].map(lang=>{
 const d=details[lang],copy=extraCopy(english,lang);
 const {hanonDescription,hanonCaption,...fields}=d;
 return [lang,{...copy,...fields,lang,root:'../',features:english.features.map(([icon,title],i)=>[icon,extraCopy(title,lang),descriptions[lang][i]]),hanon:{...copy.hanon,description:d.hanonDescription,caption:d.hanonCaption}}];
 }));
}
