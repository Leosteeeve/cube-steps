import type { GuideChapter } from './types';
import type { TourId } from '../tutorial/types';
const controls = (items: [string, string][]) =>
  items.map(([name, description]) => ({ name, description }));
export const TOUR_DESTINATIONS: Record<TourId, { label: string; href: string }> = {
  home: { label: 'Home', href: '#/' },
  quiz: { label: 'Find your route', href: '#/find-your-route' },
  moves: { label: 'Moves', href: '#/moves' },
  'lesson-intro': { label: 'Lesson introduction', href: '#/learn/notation' },
  'lesson-player': { label: 'Lesson player', href: '#/learn/white-cross' },
  solve: { label: 'Solve your cube', href: '#/solve' },
  algorithms: { label: 'Algorithm library', href: '#/algorithms' },
  algorithm: { label: 'An algorithm case', href: '#/algorithms/oll-20' },
  practice: { label: 'Formula practice', href: '#/practice' },
  timer: { label: 'Timer', href: '#/timer' },
  lab: { label: 'CFOP Lab', href: '#/lab' },
};
export const GUIDE_CHAPTERS: readonly GuideChapter[] = [
  {
    id: 'start',
    title: 'Find your first step',
    summary: 'You only need this website, a real 3 × 3 cube, and a little curiosity.',
    href: '#/',
    tourIds: ['home', 'quiz'],
    screenshotIds: ['home', 'quiz', 'home-phone'],
    steps: [
      'Open Find your route and answer four short questions. The result explains a suggested starting point; it is not a test and it does not lock you into a method.',
      'If you cannot yet solve a cube alone, start with LBL: holding and notation, a white daisy, then one layer at a time. Beginner CFOP introduces a bottom cross, F2L and two-look last-layer steps. Advanced CFOP adds shortest cross, a larger F2L catalog and full OLL / PLL.',
      'A small daily routine: review one unfamiliar move in Moves, follow one lesson with your cube, then repeat that stage once without the animation. When you can solve independently, try a few untimed solves before using Timer.',
      'In a club session, follow the leader’s chosen lesson. At home, use Resume learning to return to your last lesson. Your progress belongs to this browser; no account is needed.',
    ],
    controls: controls([
      [
        'Home / club logo',
        'Return to the club home. Moves, Learn, Timer and Guide in the top navigation open the main areas.',
      ],
      [
        'Find your route',
        'Open the four-question route recommendation. Choose one answer before pressing Next; Back revisits a previous answer.',
      ],
      [
        'Show my route / Start lesson',
        'Read the recommendation and reasons, then open the first lesson of that method.',
      ],
      [
        'Skip questions / Change route',
        'Choose LBL, Beginner CFOP or Advanced CFOP yourself. You can switch later.',
      ],
      [
        'Resume learning',
        'Resume the last lesson saved on this device. This appears after a lesson visit.',
      ],
      [
        'Home feature cards',
        'Open Moves, lessons or Timer directly. The home cube is decorative and is not a solve to copy.',
      ],
    ]),
  },
  {
    id: 'moves',
    title: 'Read a move, then try it',
    summary:
      'Letters describe positions in your current physical hold, not permanent sticker colors.',
    href: '#/moves',
    tourIds: ['moves'],
    screenshotIds: ['moves', 'moves-phone'],
    steps: [
      'Start with white up and green front, matching the display. U is up, D down, L left, R right, F front and B back. Imagine looking straight at the face that will turn.',
      'A plain letter is one clockwise quarter turn from that face’s viewpoint. A prime (′, also typed as an apostrophe) means one counterclockwise quarter turn. A 2 means a half turn, in either direction. For D, look from below to judge clockwise.',
      'Select U, choose U′, and press Play move. Watch once, then copy the upper-layer turn on your own cube. Replay the same example as often as you need. Each new example starts from a solved cube.',
      'When ready, open Explore more moves. x / y / z rotate the whole cube; wide turns move two layers together; M / E / S move a middle slice. Follow each entry’s holding and direction explanation.',
    ],
    controls: controls([
      [
        'Face buttons and Turn amount',
        'Choose a face, then a plain, prime or double turn. Selecting a move resets the demonstration.',
      ],
      [
        'Play move / Pause move / Replay',
        'Start or pause the selected turn. Replay starts that same turn again after it finishes.',
      ],
      ['Reset', 'Return the demonstration to its starting position.'],
      ['Move speed', 'Slow plays at half speed; Normal uses the regular speed.'],
      [
        'Holding view / Direction view / Reset view',
        'Look from the normal grip or straight at the turning face. Reset view restores the selected camera. Camera changes do not physically turn the cube.',
      ],
      [
        'Drag the cube',
        'Look around the model; dragging pauses playback. Keep the displayed physical holding when copying a move.',
      ],
      [
        'Explore more moves',
        'Expand whole-cube rotations, wide turns and slices. Each also supports prime and double variants.',
      ],
      [
        'Before / After',
        'With reduced motion or an unavailable renderer, compare the static endpoints instead of an animation.',
      ],
      [
        'Retry animation',
        'After a renderer error, try loading it again. The written explanation and static diagram remain useful.',
      ],
    ]),
  },
  {
    id: 'lessons',
    title: 'Learn one stage at a time',
    summary: 'Observe, prepare, perform the formula, then check what changed.',
    href: '#/learn/notation',
    tourIds: ['lesson-intro', 'lesson-player'],
    screenshotIds: ['lesson'],
    steps: [
      'Read the introduction and holding instructions before turning. Choose the stage in the lesson path; on a phone, expand the path and notes when needed.',
      'For LBL, begin with white petals around the yellow center. Match each petal’s side color with its center, then turn it down to build the white cross. Continue through first-layer corners, middle edges and the last layer.',
      'Watch one action, pause, and copy it on your cube. Use Next move for one turn at a time. Match the holding instructions: a shown whole-cube rotation must be physically followed; dragging the view is only observation.',
      'Read the recognition, preparation, formula and result check together. Mark a lesson practiced when you have tried it yourself. A checked lesson is your own record, not a skill assessment.',
    ],
    controls: controls([
      [
        'Method selector',
        'Switch among LBL, Beginner CFOP and Advanced CFOP. Preview labels identify teaching content still awaiting its own acceptance.',
      ],
      [
        'Follow along with a physical cube',
        'Expand the exact example scramble and apply it from solved, white up and green front. Before a later stage or selected case, finish all earlier moves. A stage jump changes the on-screen cube instantly; it does not move your real cube.',
      ],
      [
        'Practice example / case selector',
        'Where offered, choose a verified case or return to the full guided example. Read its own scramble and preparation; selecting a case replaces the displayed example.',
      ],
      [
        'Start with the white cross / Next lesson / Try your own scramble',
        'Continue from the introduction, advance a lesson, or open free solving when the course ends. Explore this case opens its formula reference.',
      ],
      [
        'Lesson path / stage links',
        'Open a stage directly. Introductory pages contain reading; later stages include playable demonstrations.',
      ],
      ['Lesson notes', 'Expand the stage’s goal, holding, recognition and instructions.'],
      [
        'Play / Pause',
        'Run or pause the demonstration. Controls wait until its renderer is ready.',
      ],
      [
        'Previous move / Next move',
        'Step backward or forward by one physical turn. A button is disabled at the corresponding endpoint.',
      ],
      [
        'Move position',
        'Seek to a particular turn with the slider. Keyboard arrow keys adjust the focused slider.',
      ],
      [
        'Playback speed',
        'Choose 0.25×, 0.5×, 1× or 2×. Start slowly when following on a real cube.',
      ],
      ['Highlight target pieces', 'Emphasize the pieces used in the current action.'],
      [
        'Replay formula / Replay action',
        'Repeat the current teaching formula or setup action from its start.',
      ],
      [
        'Mark as practiced',
        'Save or remove your personal check mark on this device. Tours never check it for you.',
      ],
      [
        'Learning tools',
        'Open Lessons, Solve your cube, Algorithms, Formula practice, Move explorer or Find your route.',
      ],
    ]),
  },
  {
    id: 'solve',
    title: 'Follow a solution for your cube',
    summary: 'Use a scramble sequence or enter the six faces of the cube in your hands.',
    href: '#/solve',
    tourIds: ['solve'],
    screenshotIds: ['solve', 'colors'],
    steps: [
      'Choose the method, then Scramble or Enter colors. For text input, start solved with white up and green front. Type U D L R F B with an optional prime or 2, separated by spaces; or ask for a Random scramble and physically apply it.',
      'For colors, copy the face named on screen using its holding guide. The centers stay fixed. Select a paint color and tap each sticker. Move through all six faces without guessing their orientation.',
      'Review all faces, then Check colors. Correct missing stickers, counts or impossible piece arrangements before asking for a solution. A cube needs more than nine of each color: its pieces must also form a physically possible state.',
      'Return your real cube to white up, green front and press Explain with the chosen method. Follow the resulting stages using the same player as the lessons. Read each setup and whole-cube rotation before the formula.',
      'After editing an input, generate a new solution before following it. A previous verified result may remain visible, but its summary identifies the input that produced it.',
    ],
    controls: controls([
      [
        'Scramble / Enter colors',
        'Choose the input mode. Color drafts are temporary browser-session data, not a cloud backup.',
      ],
      [
        'Check your center colors first',
        'Expand the supported center-color scheme before painting. This version supports white/yellow, green/blue and red/orange opposite pairs in the displayed arrangement.',
      ],
      [
        'Scramble sequence / Random scramble',
        'Paste standard six-face notation or generate a fresh sequence. An empty sequence represents a solved cube.',
      ],
      [
        'Paint colors / sticker cells',
        'Select one color, then apply it to editable stickers. Centers are fixed orientation references.',
      ],
      [
        'Eraser / Undo / Reset colors',
        'Erase selected stickers, undo a paint edit, or clear the entered colors. Reset is a real edit; do it only when you want to start again.',
      ],
      [
        'Back / Next / face tabs',
        'Move through the faces using the holding diagrams. Review all faces opens the full net; select a face to edit it again.',
      ],
      [
        'Check colors',
        'Validate the current draft. Read highlighted cells, counts and the error explanation; correct the draft and check again.',
      ],
      [
        'Explain with …',
        'Generate an explained solution using the selected method. Color solving stays disabled until the current colors pass validation.',
      ],
      ['Cancel', 'Stop a pending solve without following an incomplete result.'],
      [
        'Scramble / Colors used for this solution',
        'Expand the verified result’s input summary to check which cube it solves.',
      ],
      [
        'Solution stages and player',
        'Use the stage navigation, single steps, speed, target highlights and formula replay described in Lessons.',
      ],
      [
        'Input or solver error',
        'For notation errors, use the indicated character position. For a solver failure, keep the input and report it; do not treat an incomplete trace as a verified solution.',
      ],
    ]),
  },
  {
    id: 'algorithms',
    title: 'Explore the formula library',
    summary: 'Study a case’s appearance, physical holding and formula as one connected example.',
    href: '#/algorithms',
    tourIds: ['algorithms', 'algorithm'],
    screenshotIds: ['algorithms', 'algorithm'],
    steps: [
      'Start with a small family or group. The library contains 41 F2L, 57 OLL and 21 PLL cases. Search by case name or ID, then open a case you want to recognize.',
      'Read Hold and recognize before copying the formula. A diagram shows the recognition state for that formula; the player explains any preparation. Match its target slot and holding.',
      'Watch the formula in segments, then replay or step through it. Selecting another variant changes this demonstration only, not the formulas used everywhere else.',
      'Select a manageable set of cases and open Practice selected cases. Learn a few clearly rather than trying to memorize the whole catalog at once.',
    ],
    controls: controls([
      [
        'Family / Group / Search cases',
        'Filter by F2L, OLL or PLL, narrow to a group, or type a case name or ID. Clear the search or choose All if nothing matches.',
      ],
      ['Practice this case', 'Add or remove a case from your chosen practice set.'],
      [
        'Select filtered cases / Clear selection',
        'Select every currently visible case or clear your selection. Previously selected hidden cases remain selected until cleared.',
      ],
      [
        'Practice selected cases',
        'Save the selected scope locally and open untimed recognition practice. Requires at least one case.',
      ],
      ['Explore … / Algorithm library', 'Open a case detail or return to the library.'],
      [
        'Formula variant',
        'Choose an available formula and target slot. The displayed holding, segments and animation change together.',
      ],
      [
        'Case player',
        'Play, pause, single-step, change speed, seek, highlight pieces and replay the formula using the lesson-player controls.',
      ],
      [
        'Formula references',
        'Open the original source references in another tab. CubeSteps recognition diagrams and explanations are original.',
      ],
    ]),
  },
  {
    id: 'practice',
    title: 'Recognize before revealing',
    summary: 'A calm, untimed way to turn a few formulas into familiar patterns.',
    href: '#/practice',
    tourIds: ['practice'],
    screenshotIds: ['practice'],
    steps: [
      'Open the practice selection and choose families, groups or individual cases. Your scope is remembered in this browser when storage is available.',
      'Press Start practice. Start your real cube solved, white up and green front; apply the setup face turns, then the separate whole-cube holding moves shown on screen.',
      'Look at the case and say what you recognize before pressing Show solution. Check the explanation and animation, then copy the formula.',
      'Use Next case to draw another selected case. There is no timer, score or automatic correctness grading here. Use the separate Timer when you want full-solve timing.',
    ],
    controls: controls([
      [
        'Practice selection',
        'Expand the checklist. Family and group checkboxes select or remove their cases; a mixed checkbox means only some are chosen.',
      ],
      [
        'Select all cases / Clear selection',
        'Choose the full catalog or empty the scope before selecting a smaller group.',
      ],
      [
        'Reset saved practice selection',
        'Only shown for unreadable saved selection data. Explicitly replace that incompatible selection; it does not clear Timer history.',
      ],
      [
        'Individual case checkboxes',
        'Build a precise practice scope. Select at least one case before starting.',
      ],
      [
        'Start practice / Next case',
        'Generate a random verified setup from the selection. A new case replaces the previous exercise.',
      ],
      [
        'Show solution',
        'Reveal this case’s identity, recognition explanation and formula animation when you are ready.',
      ],
      ['Explore this case in the library', 'Open the detailed reference for the revealed case.'],
      ['Answer player', 'Use the shared play, step, speed, seek, highlight and replay controls.'],
      [
        'Storage or setup notice',
        'If selection storage fails, practice still works for this visit. If setup generation fails, read the error and try again.',
      ],
    ]),
  },
  {
    id: 'timer',
    title: 'Make practice measurable',
    summary: 'A separate space for scrambles, full solves and your own progress.',
    href: '#/timer',
    tourIds: ['timer'],
    screenshotIds: ['timer', 'timer-history', 'timer-phone'],
    steps: [
      'Read the random scramble from a solved cube with white up and green front. Compare your result with the six-face diagram before starting. Wait until the timing surface is ready.',
      'Without inspection: focus the timing surface, hold Space (or hold the touch surface) for at least 0.3 seconds until ready, then release to start. Press Space or touch again to stop.',
      'With 15-second inspection: the first press and release starts inspection. When ready to solve, hold until armed and release to start the solve. Under 15 seconds is clear; 15 to under 17 seconds adds +2; 17 seconds or more is DNF. The penalty is measured on release.',
      'Review the result, correct any manual penalty and repeat with the next scramble. The graph is a practice trend, not a comparison with other members. ao5 / ao12 exclude the best and worst result; one DNF can be discarded, while two make the average DNF.',
      'Export regularly. History is stored only in this browser on this device and can disappear when browser data is cleared. Exports include unsaved results, explicitly labeled; they are not automatically synced or imported.',
    ],
    controls: controls([
      [
        'New scramble',
        'Generate another scramble while idle. During preparation or a solve, finish or cancel first.',
      ],
      [
        'Timing surface / Space',
        'Hold, wait for ready, release to start; press again to stop. Space in another focused input or button retains its normal purpose.',
      ],
      [
        '15-second inspection / How timing works',
        'Toggle inspection while idle and expand the timing rules.',
      ],
      [
        'Escape',
        'Cancel preparation or inspection. Leaving, hiding or losing focus during an actual running solve records an interrupted DNF; hard termination may prevent saving.',
      ],
      [
        'Personal best / ao5 / ao12',
        'Read the best single and the latest trimmed averages. An average appears after enough attempts.',
      ],
      [
        'Trend / Inspect a plotted solve',
        'Inspect a specific result in the graph; the accessible selector offers the same information.',
      ],
      [
        'Single / ao5 / ao12 chart buttons',
        'Switch the graph between individual results and rolling averages. DNF and missing averages leave gaps.',
      ],
      [
        'Newer solves / Older solves',
        'Page through history when there are more results than fit on one page.',
      ],
      ['View solve …', 'Expand its time, penalties, original scramble and historical diagram.'],
      [
        'Adjustment for solve …',
        'Apply no manual penalty, +2 or DNF. A correction updates the history and statistics. Inspection penalties remain part of the attempt.',
      ],
      [
        'Delete solve … / Undo deletion',
        'Remove an accidental result, or restore the recent deletion with Undo.',
      ],
      [
        'Export CSV / Export JSON',
        'Download all active results, including their scrambles and save status. CSV is convenient for spreadsheets; JSON preserves structured fields.',
      ],
      [
        'Retry saving result / Reload history',
        'Resolve a failed save or reload after a storage error. Unsaved attempts remain visible and exportable.',
      ],
      [
        'Reset timer settings',
        'Only appears for incompatible saved settings; explicitly reset those settings if you choose. It does not clear history.',
      ],
      [
        'Page tour',
        'Available only when idle and saves have no unresolved errors. The tour locks timing inputs and never creates sample attempts in your history.',
      ],
    ]),
  },
  {
    id: 'lab',
    title: 'Explore CFOP Lab',
    summary:
      'An experimental workspace for experienced cubers: compare complete Cross + F2L sequences, then test how they feel in your hands.',
    href: '#/lab',
    tourIds: ['lab'],
    screenshotIds: ['lab-analyze', 'lab-compare'],
    steps: [
      'Enter a standard scramble, or select Six-face colors and match the stated holding before painting all faces. Check colors explains impossible states. An empty scramble means an already solved cube. Editing the cube or allowed colors clears the current analysis; save an experiment first if you want to keep it.',
      'Choose White only, White + yellow, All six colors, or your own nonempty selection. Each bottom has four possible fronts. Non-white bottoms require recognizing their corresponding cross and F2L pieces; do not follow white-piece instructions from memory.',
      'Press Analyze. A complete verified route appears first, then the bounded search keeps improving for up to 30 seconds including initialization. Stop keeps verified routes already found. Coverage lists checked colors, holds and path lengths; an unfinished search does not establish an overall optimum.',
      'Compare the exact cross minimum for that bottom with the chosen route. Lab also explores crosses one or two turns longer, looking for a better whole Cross + F2L sequence. The recommendation has the lowest estimated cost among the verified candidates found. It is not a guarantee of the fastest human solve.',
      'Pin a route before studying it. New recommendations do not replace your pin or rewind its player. Match the bottom and front, then follow actual x / y / z rotations with the cube. Camera dragging only changes the view; hand-regrip notes only change your grip. Neither is an extra face turn.',
      'Select routes for Compare to inspect cross length, F2L turn equivalents, pair order, rotations and handling estimates side by side. Practice the whole sequence, including its holds, before deciding whether fewer moves feel better.',
      'Trials & notes is a separate practiced Cross + F2L endpoint, not a full-solve Timer. Set up the original cube, perform the displayed initial positioning before starting, and stop when F2L is complete. OLL, PLL and final alignment are outside the measured interval. Record warmups separately from measured attempts.',
      'The lab-execution-v1 model assumes common right-hand-led two-handed handling. Its grip, visibility and awkward-transition estimates await physical calibration; scores are not seconds. Experiments and notes stay in this browser on this device until you explicitly export and share a file. They are not automatically sent to club members.',
    ],
    controls: controls([
      [
        'Scramble / Six-face colors / Random scramble',
        'Choose an input, paste face-turn notation, or generate a random scramble. Errors identify the invalid notation or color state. The six-face diagram uses the actual physical centers.',
      ],
      [
        'Allowed bottom colors',
        'Limit the search to colors you want to practice. The selection is saved locally, but choosing colors does not start analysis.',
      ],
      [
        'Analyze / Stop analysis',
        'Start a fresh analysis or stop background work while keeping verified results. Initialization or asset errors are separate from invalid cube input.',
      ],
      [
        'Search coverage and exact cross references',
        'Inspect each bottom’s shortest cross reference, fronts checked and candidate counts. Search time and bounds limit the alternatives that can be found.',
      ],
      [
        'T — turn equivalents',
        'Outer and wide quarter or half turns count as one; slice turns count as two. Initial positioning, whole-cube rotations and last-layer moves are not included in T.',
      ],
      [
        'R / G / V / A',
        'R counts actual whole-cube rotations. G estimates hand regrips, V visibility cost and A awkward transitions. A displayed regrip estimate is not another physical cube rotation.',
      ],
      [
        'Estimated cost',
        'The current hypothesis is T + 2R + 2G + 3V + 2A over Cross + F2L. Treat differences as reasons to try a route, not measured time or physical endorsement.',
      ],
      [
        'Pin route / Compare',
        'Keep a verified route in the player, or select up to four routes from the same cube for the comparison table. Editing input invalidates these selections.',
      ],
      [
        'Player / Stage / Next move / Replay',
        'Use the shared player to inspect exact physical turns and checkpoints. Initial positioning and the last layer remain playable but outside the Lab objective and trial interval.',
      ],
      [
        'Trials & notes',
        'Save an experiment and record practiced Cross + F2L attempts. Confirm setup and holding before every attempt; interruptions and deviations stay separate from comparable results. Use the ordinary Timer for full solves.',
      ],
    ]),
  },
  {
    id: 'help',
    title: 'Help, access and your data',
    summary: 'Skip a tour, come back later, and keep control of your own work.',
    href: '#/guide',
    tourIds: [],
    screenshotIds: ['tour'],
    steps: [
      'On your first eligible visit, choose Start tour, Not now or Don’t ask again. Later, Page tour and this Guide remain available. A quiet page invitation can also be dismissed.',
      'Each page tour is short. Read the bubble, try only the highlighted action when invited, and use Next. Skip step bypasses any step. Exit tour or Escape closes help. You can resume a saved step or restart from the beginning below.',
      'Simple Moves and lesson actions are real. After an ordinary tour exit, their captured view and playback position are restored, paused. Navigating away discards that temporary view. Solving, painting, practice answers and Timer records are explained without changing them.',
      'If a control is loading or unavailable, wait briefly or skip it. Guide text works even when the cube renderer fails. You can retry the animation or engine from its error message.',
      'Use Tab and Shift+Tab to navigate; Enter or Space activates focused controls, and Escape exits help or an enlarged screenshot. Reduced-motion users can compare before/after diagrams in Moves. Turn decorative animation off using the footer control.',
      'Tutorial choices, learning progress and practice scope stay local. Timer history uses this browser’s storage; color drafts are session data. There is no account or cross-device sync. Export Timer results before clearing browser data. Reset tutorial choices affects only tour preferences.',
    ],
    controls: controls([
      [
        'Start tour / Not now / Don’t ask again',
        'Start the short tour, leave a quiet reminder, or stop automatic offers. Manual help still works.',
      ],
      [
        'Back / Next / Finish tour',
        'Move within the current page tour. Hands-on steps require the matching action before Next; Skip step is always available.',
      ],
      ['Skip step / Exit tour / Escape', 'Bypass a step or close the tour immediately.'],
      [
        'Written guide / Guide',
        'Close the bubble and read its written chapter. The top Guide link opens the complete reference.',
      ],
      [
        'Start / Resume / Restart tour',
        'Start a new page walkthrough, continue saved progress, or deliberately begin again. These buttons navigate to that page first.',
      ],
      [
        'Enlarge screenshot / Close image',
        'Open a larger view of a real screenshot; Escape also closes it and returns focus. Captions remain if an image fails.',
      ],
      [
        'Reset tutorial choices',
        'Reset only tutorial preferences on this device. Progress, colors, practice scope and Timer records are untouched.',
      ],
      [
        'Footer motion preference',
        'Choose whether decorative animation runs. It is separate from the instructional move controls.',
      ],
      ['Skip to content', 'The first keyboard link jumps past the header to the main page.'],
      [
        'Reset learning data',
        'Only appears when saved learning data is unreadable. It explicitly resets lesson progress; this is separate from resetting tutorial choices.',
      ],
    ]),
  },
];
