module.exports = {
  repositoryUrl: "https://github.com/finnishtransportagency/hassu.git",
  branches: [{ name: "test", prerelease: true }, { name: "prod" }],
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
              // hidden: false,
            },
            {
              type: "feat",
              section: "Uusia ominaisuuksia",
              // hidden: false,
            },
            {
              type: "fix",
              section: "Korjauksia",
              // hidden: false,
            },
          ],
        },
        writerOpts: {
          commitGroupsSort: ["feat", "feature", "fix"],
        },
      },
    ],
    ["@semantic-release/github", { successComment: false, failComment: false }],
    [
      "@semantic-release/exec",
      {
        verifyReleaseCmd: "echo ${nextRelease.version} >.version",
      },
    ],
  ],
};
