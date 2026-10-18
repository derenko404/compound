import type { Repositories } from '../ports/repositories'

/** Wellbeing habits, read-only from outside the app. */
export class HabitService {
  private readonly repos: Repositories

  constructor(repos: Repositories) {
    this.repos = repos
  }

  async all() {
    return (await this.repos.habits.all()).sort((a, b) => a.position - b.position)
  }
}
