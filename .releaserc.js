module.exports = {
  repositoryUrl: "https://github.com/finnishtransportagency/hassu.git",
  branches: [
    { name: "prod" },
    { name: "training", channel: "test", prerelease: true },
    { name: "test", channel: "test", prerelease: true },
  ],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        releaseRules: [
          {
            type: "feat",
            release: "minor",
          },
          {
            type: "feature",
            release: "minor",
          },
          {
            type: "fix",
            release: "patch",
          },
          {
            type: "chore",
            release: "patch",
          },
          {
            type: "docs",
            release: "patch",
          },
          {
            type: "build",
            release: "patch",
          },
          {
            type: "refactor",
            release: "patch",
          },
          {
            type: "perf",
            release: "patch",
          },
          {
            type: "style",
            release: "patch",
          },
          {
            type: "test",
            release: "patch",
          },
          {
            type: "ci",
            release: "patch",
          },
          {
            type: "revert",
            release: "patch",
          },
        ],
      },
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
        presetConfig: {
          types: [
            {
              type: "feature",
              section: "Uusia ominaisuuksia",
            },
            {
              type: "feat",
              section: "Uusia ominaisuuksia",
            },
            {
              type: "fix",
              section: "Korjauksia",
            },
            {
              type: "chore",
              section: "Tehtävät",
            },
          ],
        },
        writerOpts: {
          commitGroupsSort: ["feat", "feature", "fix", "chore"],
        },
      },
    ],
    ["@semantic-release/github", { successComment: false, failComment: false, assets: [] }],
    [
      "@semantic-release/exec",
      {
        verifyReleaseCmd: "echo ${nextRelease.version} >.version",
      },
    ],
  ],
};
