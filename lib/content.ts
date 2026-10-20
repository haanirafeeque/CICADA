export const landingCopy = {
  title: "SOMETHING IS STIRRING",
  subtitle: "BENEATH FISAT",
  description: "A puzzle hunt. Keep your answers.",
  action: "ENTER YOUR ANSWERS",
  footer: "CICADA · FISAT",
};

export const guidelines = [
  "One stage is released every day. There are 3 in total.",
  "Solve each stage and keep your answer. Nobody will ask for it until the end.",
  "No answers will be posted here. Do not ask for them.",
  "At the end, enter all three answers. Collect all three answers. Something awaits those who do.",
] as const;

export const riddleText =
  "This hunt was built to lead you to something bigger. Its main event is named after a place where fans gather. Write the name of that place in capital letters, with no spaces.";

export const hintOne =
  "This hunt is a pre-event. The main event is the next big gathering on campus, and it has a name that every fan knows.";

export const hintThree =
  "Fans gather in one place. Write that place's name in capitals, with no spaces.";

export const publicNotes: Record<string, string> = {
  "01": "The first note is a fragment from the edge of the network. Observe what is present, and what is missing.",
  "02": "The second note is incomplete by design. Not every note is listed here.",
};

export const noteThreePlaceholder = "A restricted note. Its contents are available through the challenge.";

export const notesBeginnerHint =
  "Open your browser's Developer Tools and select Network. Find the /api/notes/... request made when a listed note loads. Can you request a note number that is not listed?";

export const notesStoryHint =
  "Still stuck? Watch the CICADA Instagram page for an extra hint in its Story.";

export const workshopPlaceholders = {
  name: "Workshop details to be announced",
  date: "Date to be announced",
  venue: "Venue to be announced",
};

export const eventReveal = "This was a pre-event of FANDOM ZONE.";

export const closedCopy = "THE DOOR IS CLOSED. All 15 codes have been claimed. Thank you for playing.";

export const workshopCredit = "Conducted by µLearn as part of FANDOM ZONE.";
