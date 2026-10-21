# American institutional piano-score repositories

Research checked 21 October 2026. Scope: sources for later SPino ingestion, not an import manifest. No scores or product files were changed. “Public domain” below reports an institution's statement; it is not a worldwide legal clearance. Download verification distinguishes a successfully fetched PDF from an indexed catalogue's advertised PDF.

## Which repositories merit further acquisition work?

### Takeaway

Prioritize Library of Congress collections whose item records explicitly say free to use and reuse, then Sibley for classical piano breadth. Toronto and Washington have particularly clear scan-reuse statements. Brazil, Chile and Duke require item-specific checks before redistribution.

### Cited Findings

| Priority / institution | Stable discovery and item examples | Rights and commercial reuse | Access, automation and relevance |
|---|---|---|---|
| 1. US Library of Congress (national library) | [Music for the Nation, 1870–1885 example](https://www.loc.gov/item/2023823592/); [after-1885 collection rights](https://www.loc.gov/collections/american-sheet-music-after-1885/about-this-collection/rights-and-access/) | The cited collections say public domain and free to use/reuse, with Library of Congress, Music Division credit. Do not apply this to all LOC: [Maple Leaf Rag 1911](https://www.loc.gov/item/2023864251/) has a broader educational/research notice, independent-assessment requirement and warning about other nations and fair-use-only items. | Item pages advertise PDF and images, metadata exports and IIIF manifests. Official [JSON/YAML and IIIF API documentation](https://www.loc.gov/apis?loclr=ealtr) supports harvesting and thumbnails; [item endpoint](https://www.loc.gov/apis/json-and-yaml/requests/endpoints/) returns resources. Piano solo, dances and instructional music are relevant; no normalized difficulty field established. |
| 2. Sibley / Eastman, University of Rochester (US university) | [General collections](https://www.esm.rochester.edu/sibley/generalcollections/); [Ravel Sonatine stable handle](https://hdl.handle.net/1802/19808) | Institution reports digitizing public-domain scores and books; Ravel item explicitly states public domain. This is a US institution: no worldwide edition clearance established. Some other repository records explicitly describe access under the final 20 years of US copyright/DMCA, so never treat repository membership as permission: [example browse records](https://urresearch.rochester.edu/browseRepositoryItems.action%3Bjsessionid%3DEF0DE84393209265D96924002A550F44?contentTypeId=-1&currentPageNumber=356&rowStart=8875&selectedAlpha=All&sortElement=publicationDate&sortType=desc&startPageNumber=341). | More than 30,000 digitized scores/books stated by library. Real PDF download verified below. Stable handles and descriptive subject/contributor/publication metadata; no documented public API verified. Excellent classical piano coverage. No normalized difficulty field found. |
| 3. University of Washington, Pacific Northwest Sheet Music (US university) | [Husky songs item](https://digitalcollections.lib.washington.edu/digital/collection/sm/id/177/) | Item's Digital Copyright states collection materials public domain, no copyright permissions needed, source acknowledgement requested. This covers digital images more explicitly than many libraries. Still assess territorial composition/arrangement rights separately. | CONTENTdm compound page images, performance-medium metadata. Example is voice/piano, not solo; targeted piano-solo selection still needed. PDF export and documented API not verified in this pass. |
| 4. Toronto Public Library Digital Archive (Canada public library) | [O Canada score item](https://digitalarchive.tpl.ca/objects/354845/o-canada-our-fathers-land-of-old--o-canada-terre-de-nos); [search with public-domain filter](https://digitalarchive.tpl.ca/search/%2A?filter=flexFieldsCountry%3ACanada) | [Policy](https://tpl.ca/digital-archive/licences/) explicitly permits public-domain-labelled images in electronic/print form for any purpose including commercial/marketing. Courtesy of Toronto Public Library credit appreciated. Do not include copyright-labelled items. | Object records expose download and RDF/XML/JSON; IIIF appears on archive search/image pages. Medium-resolution downloads free; high resolution may cost: [image service](https://tpl.ca/using-the-library/services/special-collections-digital-image-service/). A music-specific API and solo-piano inventory remain unverified. |
| 5. Duke Historic American Sheet Music (US university) | [Institutional collection description](https://blogs.library.duke.edu/digital-collections/hasm/about/) | 3,042 pieces published 1850–1920. [General reuse policy](https://library.duke.edu/about/reuse-attribution) limits default permission to noncommercial use with attribution, requests contact for commercial reuse/mirroring/publication. However [Rubenstein policy](https://library.duke.edu/rubenstein/research/citations-and-permissions) says no permission request or fees required for public-domain-labelled materials; item-level label and applicable collection policy must govern. | Digital page images; useful dances/studies alongside vocal scores. No exact solo-piano item/download/API verified. Do not reject public-domain items solely on generic policy; resolve scope per record. |
| 6. Fundação Biblioteca Nacional / BNDigital (Brazil national library) | [Digital catalogue](https://bndigital.bn.gov.br/acervodigital/); [official guide to scores in periodicals, 1842–1922](https://antigo.bn.gov.br/sites/default/files/documentos/miscelanea/2021/rag44_guia_musical_final-7774.pdf) | Catalogue says public-domain OR rights-holder-authorized publication, which is not redistribution permission. [FAQ](https://bndigital.bn.gov.br/perguntas-e-respostas/) allows personal/research copies, directs commercial-copy requests to curators and requires prior consent for partner Rede da Memória Virtual Brasileira documents, including public-domain works. Its newer Hemeroteca paragraph allows public-domain reuse with author/source citation. These differing scopes must be resolved for each asset. | FAQ documents page image saving and advanced search. Strong potential for Brazilian salon piano and dances, but exact standalone PDF and public API not verified. Required credit includes Acervo da Fundação Biblioteca Nacional – Brasil and partner owner where applicable. |
| 7. Biblioteca Nacional Digital de Chile (national library) | [Music archive](https://www.bibliotecanacional.gob.cl/archivo-de-musica); [exact online score example](https://www.bibliotecanacionaldigital.gob.cl/pywb/dibam/20191109131339mp_/http%3A/www.bibliotecanacionaldigital.gob.cl/bnd/623/w3-article-148623.html) | Archive holds editions from 1851–1960, but this is not clearance. The Noche example has online access and Download yet explicitly requires author/rightsholder authorization for use. No blanket commercial scan-reuse grant verified. | Item offers download, viewer and OAI record. Useful Chilean repertoire potential; exact public-domain solo edition with cleared scan remains a gap. Do not import the cited modern voice/piano example. |
| 8. Library and Archives Canada (national library) | [Official sheet-music collection overview](https://www.bac-lac.gc.ca/eng/discover/films-videos-sound-recordings/virtual-gramophone/Pages/internet.aspx); [historical project description](https://epe.lac-bac.gc.ca/100/202/301/bulletin_nlc/2001/no3/p2-0105-03-e.html?nodisclaimer=1) | Historical project contains public-domain material AND material cleared for online access. No blanket redistribution license established. Canada's rules differ by contributor/date: [McGill institutional FAQ](https://libraryguides.mcgill.ca/MusicCopyrightFAQ) explains multiple contributors, editorial additions and 2022 term changes. | Overview describes pre-1921 Canadian sheet music, searchable by title/name/subject and browsable by score. Old links/archival surfaces increase integration risk. Modern API and exact solo-piano downloads not verified. |

### Inferences

- Best first acquisition experiment: LOC item-scoped harvesting plus Sibley PDF verification. Archive scans can supply immediate notation previews; they do not supply MusicXML or reliable automatic difficulty.
- Toronto's explicitly commercial scan policy is promising, but Canadian public-domain status still needs checking against intended distribution countries and every editor/arranger.
- LOC ragtime candidates by later-lived composers need particular territorial care; an early US publication date is insufficient by itself for worldwide use.

### Gaps

- No repository in this pass supplied a verified normalized pedagogical difficulty rating. Do not fabricate beginner/intermediate/advanced ratings from titles, composer names or marketing adjectives.
- Washington, Duke, Brazil, Chile and LAC need further exact-item selection and byte-level download verification before ingestion. Public API availability was not established for these sources, except the OAI link visibly offered by Chile.

## Which exact editions have usable assets and source rights evidence?

### Takeaway

One exact PDF was fetched successfully. Three additional LOC piano editions have explicit institutional reuse statements and advertised PDF/IIIF access, but automated retrieval was blocked during this pass. A fifth university item offers a download without a verified reuse statement and is a research lead only.

### Cited Findings

| Edition | Rights evidence | Asset/access proof | Difficulty / decision |
|---|---|---|---|
| Maurice Ravel (1875–1937), Sonatine pour le piano, A. Durand, Paris, 1905, plate D. & F. 6624, 15 pages | [Item](https://urresearch.rochester.edu/institutionalPublicationPublicView.action?institutionalItemVersionId=19375) states public domain. [Stable handle](https://hdl.handle.net/1802/19808). | [Exact PDF](https://urresearch.rochester.edu/fileDownloadForInstitutionalItem.action?itemFileId=65564&itemId=19735) returned application/pdf, 15 pages through web fetch on research date; catalogue file 39087012350742sonatine.pdf, 1.16 MB. | No repository level; treat as ungraded until pedagogical review. Strong acquisition candidate, pending distribution-territory/edition review. |
| Will Baker, Leaves and leaflets, a collection of easy and instructive piano, Buffalo: Cottier & Denton, 1875 | [Exact item and rights](https://www.loc.gov/item/2023823592/) explicitly identifies public-domain collection, free use/reuse, Music Division credit. | Indexed official item advertises image/PDF and IIIF manifest. Live item/API requests returned 403 via web, shell network unavailable. Exact raw PDF URL NOT verified. | “Easy and instructive” is original title wording, not standardized difficulty evidence. Particularly relevant acquisition lead for teaching repertoire. |
| W. F. Hascall, Polonaise, Boston: Arthur P. Schmidt, 1878, 9 images | [Exact item](https://www.loc.gov/item/2023831639/) and [resource](https://www.loc.gov/resource/music.mussm-sm1878-13343/?st=slideshow) carry same explicit collection reuse statement. | Resource advertises PDF/image and nine-page image sequence. API/live retrieval 403; do not guess storage PDF URL. | No level. Verify full score image readability, instrumentation and publisher/editor data before inclusion. |
| J. S. Knight, Down in a coal mine, waltz, New York: C. H. Ditson & Co., 1873, 4 images | [Exact item/rights](https://www.loc.gov/item/2023819166/) says public domain/free use and reuse and lists piano music/waltzes. | Official indexed record advertises PDF and IIIF manifest, four image sequence. Exact raw PDF not retrieved. | No level. Candidate only until actual download works and score is reviewed. |
| James Sylvester Scott, Grace and Beauty, Stark Music Company, 1909, 6 pages, USF item A65-00189 | [University item](https://digitalcommons.usf.edu/aa_sheet_music/176/) has bibliographic details but no reuse statement verified in extracted record. | Download full text link advertises 6.2 MB; click failed in web tool. This is NOT verified downloadable asset proof. | Hold. Do not import solely because 1909 or freely viewable. |

### Inferences

- LOC official API should be used to resolve real asset URLs after the access block clears; never synthesize storage URLs from item numbers. The institution's [endpoint guide](https://www.loc.gov/apis/json-and-yaml/requests/endpoints/) explicitly describes item resources.
- All examples except Ravel are acquisition leads, not production-ready verified downloads. This intentionally falls short of claiming 3–5 byte-verified assets.

### Gaps

- This pass did not obtain 3–5 successfully fetched, rights-cleared piano PDFs. Only Ravel achieved actual PDF fetch; LOC catalogue evidence is strong but its live site rejected automated requests. No score should be added to the app from an unresolved catalogue reference.
- Composer life dates and all editorial contributions for Baker/Hascall/Knight were not established; their institutional collection statements are evidence, not a substitute for territorial review.

## How should SPino use these sources without exposing unfinished research?

### Takeaway

Keep this discovery list outside the app. Promote a specific edition only after the PDF downloads, rights are documented for that edition/scan and the score is readable. Preview and honest ungraded labels are useful immediately; guessed ratings are not.

### Cited Findings

- LOC supports structured metadata and IIIF-compliant images, suitable for first-music-page previews and source-linked provenance: [official APIs](https://www.loc.gov/apis?loclr=ealtr).
- A score may include separately protected fingerings/performance indications/editorial additions, and duration varies by country and contributor: [McGill music copyright FAQ](https://libraryguides.mcgill.ca/MusicCopyrightFAQ).
- Duke's public-domain policy differs in scope from its generic website policy; retain the exact record statement with acquisition evidence: [Rubenstein](https://library.duke.edu/rubenstein/research/citations-and-permissions), [general website policy](https://library.duke.edu/about/reuse-attribution).

### Inferences

- Suggested internal acceptance record: stable institutional item URL, exact asset URL, SHA-256, download check date/status/MIME/page count, composer and all editors/arrangers, edition date, source rights URL and short statement, intended territories, attribution text and visual score review. Keep unsupported records in research only.
- Preview the first notation page rather than a decorative cover; retain attribution and source link in details. Use “Not assessed” when no verified difficulty source exists. A future internally reviewed rating must identify its provenance and apply to the exact edition.
- Prioritize LOC pedagogical works and Sibley classical solo music over mixed vocal collections for relevant expansion; then test Washington/Toronto where digital reuse terms are explicit.

### Gaps

- No ratings-reuse license or API was identified from these archives. No user popularity rating should be implied by an archival subject heading or historical publisher description.
- Commercial redistribution permissions must not be inferred from public access, download buttons or an institution having permission to publish online.
