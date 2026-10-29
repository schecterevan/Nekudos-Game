// Round state machine: tracks attempts, decides when to demonstrate the answer, and re-queues
// a question the child needed help with so it comes back later in the same round. Pure.
//
// Outcomes recorded per question:
//   'first'   correct on the first try
//   'retry'   correct after one or more misses, without being shown
//   'helped'  correct after the answer was demonstrated
//   'practice' try-reading cards (no right/wrong)

// At most this many questions come back at the end of a round, so a hard round stays short.
export const MAX_REVIEWS_PER_ROUND = 2;

export class Round {
  constructor(questions, { helpAfterMisses = 2 } = {}) {
    this.reviews = 0;
    this.queue = questions.map((q) => ({ ...q }));
    this.index = 0;
    this.helpAfterMisses = helpAfterMisses;
    this.results = [];
    this.attempts = 0;
    this.helped = false;
    this.wrongIds = new Set();
  }

  get current() {
    return this.queue[this.index] || null;
  }
  get done() {
    return this.index >= this.queue.length;
  }
  get total() {
    return this.queue.length;
  }

  // Returns { correct, outcome?, demonstrate?, correctIds? }
  answer(choiceId) {
    const q = this.current;
    if (!q) throw new Error('Round is finished');
    if (q.activity === 'try-read') {
      this.finish('practice');
      return { correct: true, outcome: 'practice' };
    }
    const choice = q.choices.find((c) => c.id === choiceId);
    if (!choice) throw new Error(`Unknown choice ${choiceId}`);
    if (choice.correct) {
      const outcome = this.helped ? 'helped' : this.attempts === 0 ? 'first' : 'retry';
      this.finish(outcome);
      return { correct: true, outcome };
    }
    this.attempts += 1;
    this.wrongIds.add(choiceId);
    const correctIds = q.choices.filter((c) => c.correct).map((c) => c.id);
    if (this.attempts >= this.helpAfterMisses && !this.helped) {
      this.helped = true;
      if (!q.requeued && this.reviews < MAX_REVIEWS_PER_ROUND) {
        this.reviews += 1;
        this.queue.push({ ...q, requeued: true });
      }
      return { correct: false, demonstrate: true, correctIds };
    }
    return { correct: false, demonstrate: this.helped, correctIds };
  }

  finish(outcome) {
    const q = this.current;
    this.results.push({ key: q.key, mode: q.mode, targetId: q.targetId, tags: q.tags, outcome, review: !!q.requeued });
  }

  // Call after the success feedback, to move on.
  next() {
    this.index += 1;
    this.attempts = 0;
    this.helped = false;
    this.wrongIds = new Set();
    return this.current;
  }
}
