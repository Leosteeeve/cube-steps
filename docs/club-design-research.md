# Webb Cubing Club: design research

Research and source audit: 28 October 2026. Baseline: `002aecba433ff82d938bd83c81ad2342895d7d5a`. This document records observations before implementation, not a retrospective justification.

## Method and evidence

Twelve references across product, editorial, student community, cubing and education were opened. Browser screenshots and DOM observations were used alongside official page text. Screenshots are in `validation/club-editorial-redesign/references/` outside the Git checkout. Desktop viewport: 1440 × 1000; phone: 375 × 844. Screenshot width may exclude a scrollbar. Some media was still loading: that is explicitly distinguished below. No signup, mailing-list submission or account change was made. Assets are references only and are not copied into the product.

## References and specific observations

| Reference / pages inspected | Direct observation | Useful principle / limitation for Webb |
| --- | --- | --- |
| [Linear](https://linear.app/) and [Planning](https://linear.app/plan) | Desktop: broad left-aligned headline, tightly grouped navigation, one large product demonstration below the copy. Planning page groups projects, milestones and updates around concrete UI examples. Thin separators distinguish dense content without boxing every sentence. | Show the real tool and use a consistent alignment system. Reject its dark corporate positioning, AI sales language, subdued small text and elaborate demo density for beginners. |
| [Notion](https://www.notion.so/) and [Guides](https://www.notion.com/help/guides) | Desktop home uses a very large sans headline, illustration mixed with product UI and one clear primary action. Phone Guides places search, title, short introduction, three filters and result count before articles; the heading wraps cleanly. Cookie overlay obscures part of the home screenshot. | A coherent type family survives marketing and utilitarian pages. Keep plain language and explicit actions; reject enterprise proof-logo strips, animated headline fragments and an unnecessary filter layer for our small course list. |
| [Arc](https://arc.net/) | The current page is a farewell, not the older browser landing page. A compact colorful logo, centered serif title and short text lead to a letter, a dated timeline and migration instructions. | Warm editorial voice can clarify a difficult subject. Do not invent observations of its historical product UI or copy a full-screen centered marketing composition. |
| [Are.na](https://www.are.na/) | A narrow reading column introduces the service with a simple list; a divider leads to Capture/Arrange/Search/Connect/Network controls. On phone the steps form a vertical sequence. Clicking Arrange focused it, but the captured status still said Capture; product media remained blank in this session. | Use typography and a few rules to carry hierarchy. Adopt the clear task verbs, not low-contrast inactive text, blank media or the assumption that the demonstration successfully changed. |
| [Siteinspire](https://www.siteinspire.com/) and [Typographic category](https://www.siteinspire.com/websites/category/typographic) | Small introduction beside broad category navigation, then two large examples with compact credits; later entries become denser. Category selection is distinct from gallery items. | Vary scale according to content, retain clear axes. A library benefits from a grid; the homepage does not need every section to be one. We inspected its curation, not every listed website. |
| [Awwwards](https://www.awwwards.com/) and [portfolio detail](https://www.awwwards.com/sites/g-colombel-portfolio-2026) | Phone detail separates award/date, title, author and a media frame, followed by named interaction elements. The home screenshot was an unfinished loading state; detail media also had not rendered. The page promotes preloaders and fluid mouse interactions as design elements. | Strong distinction between metadata and content. Reject award-driven spectacle, preloaders, promotional tickers and mouse effects in a learning tool. No claim that the awarded site's actual interactions were tested. |
| [The Creative Independent](https://thecreativeindependent.com/) and [Welcome](https://thecreativeindependent.com/welcome/) | Desktop is a dense color-block editorial index with monospaced titles, dates and minimal chrome. Welcome changes to a letter and topic-based starting paths. On phone the prose is large and comfortable, although the introductory paragraph occupies most of the screen. | A community can speak directly to a newcomer and offer paths by intent. Reject the all-over mono face, saturated article grid and long introduction before action. |
| [WCA](https://www.worldcubeassociation.org/), [FAQ](https://www.worldcubeassociation.org/faq), [newcomer competition](https://www.worldcubeassociation.org/competitions/AucklandNewcomerOpen2026) | Browser home resolved in Chinese: dense practical navigation, six purpose-specific entries over a full cube-color background, then news. Official FAQ/newcomer text explains equipment, skill, arrival and help. | Concrete answers build trust. Keep the domain-specific clarity; reject six equally promoted CTAs, small dense text and a loud six-color background. An association portal is not a first-lesson interface. |
| [CubingUSA](https://cubingusa.org/) and [Regional Championships](https://cubingusa.org/regional) | Region map, descriptive title, policy explanation, then name/place/date entries. On desktop some icons rendered as literal `calendar_month`/`pin_drop`, illustrating fragile icon-font dependence. | Real practice/event information is stronger than generic community claims. Use dependable inline shapes/text. Do not invent a Webb schedule or import regional competition listings as club events. |
| [Mathigon](https://mathigon.org/) and [Transformations introduction](https://mathigon.org/course/transformations/introduction) | Desktop lesson pairs persistent topic navigation with a wide reading/interactive area. DOM exposes reading estimate, reveal-all, narration, glossary and progressive steps. Some example images were not loaded in the screenshot. | Separate navigation from the current learning action; make help optional and reversible. Keep our existing lesson disclosure and synchronized cube. Do not impose forced progression or claim this is human learning-effectiveness evidence. |
| [MIT Solar team](https://www.mitsolar.com/) and [About](https://www.mitsolar.com/about) | Official content names a student-run team, its work and specific responsibilities/history. The captured home was dominated by a blurred vehicle background and scroll instruction; text was not visible in that first visual state. | Authenticity comes from real work and people. Reject a full-screen cinematic intro that delays access; no stock students or fabricated club roles in Webb. |
| [Hack Club](https://hackclub.com/) | Desktop uses an informal direct headline, real project/member examples and photographs around the edge. Youthful energy comes from concrete creative work. A phone capture immediately after viewport change retained the desktop composition; it is transition evidence, not a reliable finished mobile verdict. | Borrow the candid student voice and real examples, not sticker clutter, ornamental loops or social proof we do not possess. |

Additional attempted reference: [HackMIT](https://hackmit.org/) opened but returned no extractable body to the research tool. Its current title said 2027 while indexed FAQ text described 2026. It is excluded from the twelve substantive comparisons. This avoids treating stale search snippets as current design evidence.

## Comparative audit of CubeSteps

The baseline is functional and has valuable assets: native hash links, a real projected cubie mesh, honest browser-local progress, working tours, a readable cube stage with 2D fallback, durable timer/history and method-specific labs. Those remain.

The desktop home devotes most of the first screen to an abstract slogan, an oversized decorative cube, orbit, floating notes and a blue promotional strip. Three later cards repeat the learn/practice message. Its typography crosses Georgia, Segoe and several tiny uppercase tiers. On phone the title occupies four lines before the action; the cube arrives only near the bottom of the viewport. The “Join a lesson” and strip link duplicate the notation destination. These are directly observed composition problems, not a claim that cards or serif type are inherently AI-generated.

The tool shell introduces a second visual product: pills, multiple navigation rows, large-radius panels and different type sizes. The source has conflicting ownership: `styles.css` → `club.css` → `workspace.css`, plus lazy `moves.css` overriding the header. The same component can inherit different styling after a route visit. Fixing that is part of design coherence.

## Three directions considered

Scores are designer judgments (1–5), not user research results.

| Direction | Originality | Readability | Club identity | UX | Cost | Tool coherence |
| --- | --- | --- | --- | --- | --- | --- |
| **Practice notebook** — warm paper, ink, geometric sans, notation mono, ruled lists, a real cube specimen | 4 | 5 | 4 | 5 | Moderate | 5 |
| **Competition desk** — compact score-sheet grid, stronger numeric type, near-white/black, color for statuses | 4 | 4 | 5 | 3 for newcomers | Moderate | 5 |
| **Club journal** — expressive editorial type, irregular images, community stories and colored sections | 5 | 4 | 5 with real assets | 4 | Higher; needs genuine content | 3 |

**Selected: Practice notebook.** It best connects a welcoming entrance to serious practice without pretending every visitor is a competitor. A self-hosted geometric humanist sans (Manrope) replaces the Georgia/Segoe split; IBM Plex Mono is limited to notation and numeric detail. Warm neutral grounds and a deep green action color let red/orange/blue/yellow facelets provide the personality. The homepage reads as an opening spread followed by a useful directory, not a product sales funnel. The selection is the designer's autonomous decision under the user's brief, not a separately claimed owner approval.

## Design rules carried into implementation

1. Lead with “Pick up a cube.” and identify the club in normal, readable text. Put the actual next action above decorative content on phone.
2. Give the headline a full-width composition; place the cube in a purposeful practice spread rather than a floating text-left/illustration-right hero.
3. Retain the resume destination from saved progress. Give first-time, developing and experienced solvers plain-language paths; explain unfamiliar method names at the destination.
4. Use rules and list alignment for learning choices; use bounded panels only for interactions, selectable answers and contained workspaces.
5. Keep motion user-initiated and bounded. Retain offscreen/visibility/reduced-motion safeguards and a static fallback.
6. Maintain one club token owner, scoped to the club edition. Shared geometry stays shared; cube colors and solver states are not recolored by generic selectors.
7. Body text 16px, important secondary text at least 14px; metadata 13px only when nonessential. Controls at least 44px high. Dark text remains readable on warm light surfaces.
8. Keep exact hrefs, guidance targets and owner/provider lifetimes. No new storage, framework, analytics or account system.
9. Mobile comes first in reading order. Do not hide learning controls to make a screenshot cleaner. Test 375/768/1024/1440 and reduced-motion/keyboard paths.
10. Retain the accepted v3 film and solver Preview/Experimental status. A visual redesign does not imply physical teaching acceptance.

## Rejected patterns

Full-screen splash/scroll instructions; generic promises; automatic decorative loops; orbit/floating callouts; repetitive CTA cards; gradients/glows; tiny spaced capitals; all-over mono; fake statistics; invented events; photo placeholders posing as real students; wholesale transplantation of any reference layout.

## Evidence limits

This is an expert design audit, not student usability research. Browser captures establish rendered observations for this session; media loading problems and mobile transition captures are identified above. Before/after and final interaction findings are recorded separately in `docs/club-redesign-report.md` after implementation.

## Typography and motion refinement — 28 October follow-up

The owner approved the overall direction and requested more distinctive typography plus gently appearing UI. The initial Manrope choice above records the first iteration; the final implementation uses Bricolage Grotesque for display headings, Instrument Sans for body/controls, and the existing IBM Plex Mono for notation.

| Additional reference | Direct observation | Design interpretation and decision |
| --- | --- | --- |
| [Figma homepage](https://www.figma.com/) | Desktop headline computed as Figma Sans, 56px/56px, weight 400, −1.25px tracking. Navigation and actions are markedly smaller; the first composition uses large mixed-media artwork. Cookie notice overlaps the captured artwork. | Size and spacing can create hierarchy without heavy weights everywhere. Adopt that restraint; do not copy the proprietary font, media collage or marketing copy. |
| [Instrument](https://www.instrument.com/) and Services navigation | The DOM/CSS identifies Instrument Sans, with a 15px, widely tracked “Recent work” label. Navigation is compact; a large wordmark dominates the first screen. Captures caught blank/fading states and a partially revealed wordmark; these do not establish exact transition durations or successful final mobile behavior. | A compact sans works well for controls. Reject the delayed/blank reveal states and ubiquitous tracked uppercase for our educational UI. The open-source font is separately licensed by its [official repository](https://github.com/Instrument/instrument-sans). |
| [Bricolage Grotesque official specimen](https://ateliertriay.github.io/bricolage/) | Desktop and 375px captures show expressive counters and changing width/weight, paired with plainly readable body copy. The specimen offers weight, width and optical-size controls, and discusses the calmer small-optical-size forms. | Use normal width and a moderate 600 weight at optical size 48 for headings. Keep its distinctive shapes out of dense controls and cube notation. Do not reproduce the specimen's extreme condensed headline or personal photography. |

[Stripe Press](https://stripepress.com/) was attempted but failed with an SSL protocol error; it is not an observed reference. Screenshots are retained under validation/club-editorial-redesign/references. These are expert observations, not user preference study results.

Three refinement choices were compared: retain Manrope for maximum continuity; use Instrument Sans alone for the lightest consistent system; or pair Bricolage headings with Instrument body. The pair adds recognizable, friendly shape without compromising tool legibility. Actual screenshots exposed inconsistent variable-font weight rendering in this Windows WebKit build: the headline became much heavier and body emphasis disappeared. This is an observed test-environment result, not a claim about every Safari version. The final implementation uses official, unmodified static subsets: Bricolage 600 / optical size 48, Instrument 400/600/700, and the retained notation face. All five WOFF2 files total 88,536 bytes, about 49KB more than the first Manrope iteration, with swap/fallback behavior and retained OFL licenses. This also removes the need to rely on variation-axis support.

Motion uses one 420ms entrance, 14px upward travel, opacity 0.6→1, for below-fold homepage groups only. Content is never hidden while waiting for an observer. Already visible content stays still; keyboard focus cancels motion immediately. Device reduced-motion, the existing Off preference, missing browser APIs and print retain static readable content. This owner-requested enhancement supersedes the initial user-initiated-only rule for these three homepage groups. The cube turn remains explicit and bounded; no decorative loop, text-by-text stagger or workspace transition was added.
