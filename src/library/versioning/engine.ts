export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  preRelease?: string;
}

export interface MigrationHook {
  sourceVersionRange: string;
  targetVersion: string;
  migrate(data: any): any;
}

export function parseSemVer(version: string): SemVer {
  const parts = version.split('-');
  const mainParts = parts[0].split('.');
  const major = parseInt(mainParts[0] || '0', 10);
  const minor = parseInt(mainParts[1] || '0', 10);
  const patch = parseInt(mainParts[2] || '0', 10);
  const preRelease = parts[1];

  return { major, minor, patch, preRelease };
}

export function compareSemVer(v1: string, v2: string): number {
  const s1 = parseSemVer(v1);
  const s2 = parseSemVer(v2);

  if (s1.major !== s2.major) return s1.major - s2.major;
  if (s1.minor !== s2.minor) return s1.minor - s2.minor;
  if (s1.patch !== s2.patch) return s1.patch - s2.patch;

  if (s1.preRelease && !s2.preRelease) return -1;
  if (!s1.preRelease && s2.preRelease) return 1;
  if (s1.preRelease && s2.preRelease) {
    if (s1.preRelease < s2.preRelease) return -1;
    if (s1.preRelease > s2.preRelease) return 1;
  }

  return 0;
}

const migrationsRegistry: MigrationHook[] = [];

export function registerMigration(hook: MigrationHook): void {
  migrationsRegistry.push(hook);
}

export function clearMigrations(): void {
  migrationsRegistry.length = 0;
}

export function migrateComponent(component: any, targetVersion: string): any {
  let migrated = { ...component };
  let currentVersion = component.version || '1.0.0';

  if (compareSemVer(currentVersion, targetVersion) >= 0) {
    return migrated;
  }

  // Sort migrations chronologically
  const sortedMigrations = [...migrationsRegistry].sort((a, b) => compareSemVer(a.targetVersion, b.targetVersion));

  for (const migration of sortedMigrations) {
    if (
      compareSemVer(currentVersion, migration.targetVersion) < 0 &&
      compareSemVer(migration.targetVersion, targetVersion) <= 0
    ) {
      migrated = migration.migrate(migrated);
      currentVersion = migration.targetVersion;
      migrated.version = currentVersion;
    }
  }

  return migrated;
}
