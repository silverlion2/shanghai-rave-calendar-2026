const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const POSTERS_DIR = path.join(ROOT, "assets", "posters");
const ARCHIVE_SCRIPT = path.join(ROOT, "scripts", "generate-poster-archive.js");
const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const OPTIMIZED_SUFFIX = "-optimized";

const DEFAULTS = {
  maxWidth: 1200,
  maxHeight: 1800,
  quality: 78,
  skipUnderBytes: 120 * 1024,
  minSavingPercent: 3,
  concurrency: 3,
};

main().catch(error => {
  console.error(`Poster optimization failed: ${error.message}`);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const posterFiles = findPosterFiles(options.inputs);

  if (!posterFiles.length) {
    console.log("No poster source files found.");
    return;
  }

  const results = await runLimited(
    posterFiles,
    options.concurrency,
    sourcePath => optimizePoster(sourcePath, options),
  );

  printSummary(results, options);

  if (options.archive && !options.dryRun) {
    execFileSync(process.execPath, [ARCHIVE_SCRIPT], {
      cwd: ROOT,
      stdio: "inherit",
    });
  }
}

function parseArgs(args) {
  const options = {
    archive: false,
    dryRun: false,
    force: false,
    all: false,
    allowLarger: false,
    inputs: [],
    maxWidth: readPositiveInt(process.env.POSTER_MAX_WIDTH, DEFAULTS.maxWidth),
    maxHeight: readPositiveInt(process.env.POSTER_MAX_HEIGHT, DEFAULTS.maxHeight),
    quality: readPositiveInt(process.env.POSTER_JPEG_QUALITY, DEFAULTS.quality),
    skipUnderBytes: readPositiveInt(process.env.POSTER_SKIP_UNDER_BYTES, DEFAULTS.skipUnderBytes),
    minSavingPercent: readPositiveInt(process.env.POSTER_MIN_SAVING_PERCENT, DEFAULTS.minSavingPercent),
    concurrency: readPositiveInt(process.env.POSTER_OPTIMIZE_CONCURRENCY, DEFAULTS.concurrency),
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--archive") options.archive = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--all" || arg === "--compress-all") options.all = true;
    else if (arg === "--allow-larger") options.allowLarger = true;
    else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else if (arg === "--input" || arg === "--file") {
      index += 1;
      if (!args[index]) throw new Error(`${arg} requires a path`);
      options.inputs.push(args[index]);
    } else if (arg === "--concurrency") {
      index += 1;
      if (!args[index]) throw new Error("--concurrency requires a positive integer");
      options.concurrency = readPositiveInt(args[index], options.concurrency);
    } else if (arg.startsWith("--input=") || arg.startsWith("--file=")) {
      options.inputs.push(arg.slice(arg.indexOf("=") + 1));
    } else if (arg.startsWith("--max-width=")) {
      options.maxWidth = readPositiveInt(arg.slice("--max-width=".length), options.maxWidth);
    } else if (arg.startsWith("--max-height=")) {
      options.maxHeight = readPositiveInt(arg.slice("--max-height=".length), options.maxHeight);
    } else if (arg.startsWith("--quality=")) {
      options.quality = readPositiveInt(arg.slice("--quality=".length), options.quality);
    } else if (arg.startsWith("--skip-under-bytes=")) {
      options.skipUnderBytes = readPositiveInt(arg.slice("--skip-under-bytes=".length), options.skipUnderBytes);
    } else if (arg.startsWith("--concurrency=")) {
      options.concurrency = readPositiveInt(arg.slice("--concurrency=".length), options.concurrency);
    } else {
      options.inputs.push(arg);
    }
  }

  if (options.quality > 100) {
    throw new Error("--quality must be between 1 and 100");
  }

  return options;
}

function printUsage() {
  console.log(`Usage:
  node scripts/optimize-posters.js [options] [poster paths]

Options:
  --archive                 Regenerate data/poster-archive.json after optimizing.
  --dry-run                 Report actions without writing files.
  --force                   Rebuild optimized files even when current outputs are fresh.
  --all, --compress-all     Create optimized files for every source, including small posters.
  --allow-larger            Keep optimized output even if it is larger than the source.
  --input <path>            Optimize one poster path under assets/posters/.
  --max-width=<px>          Default: ${DEFAULTS.maxWidth}
  --max-height=<px>         Default: ${DEFAULTS.maxHeight}
  --quality=<1-100>         Default: ${DEFAULTS.quality}
  --skip-under-bytes=<n>    Default: ${DEFAULTS.skipUnderBytes}
  --concurrency=<n>         Parallel poster jobs. Default: ${DEFAULTS.concurrency}
`);
}

function readPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function findPosterFiles(inputs) {
  if (inputs.length) {
    return inputs.map(resolvePosterInput).filter(isPosterSource);
  }

  if (!fs.existsSync(POSTERS_DIR)) return [];

  return walk(POSTERS_DIR)
    .filter(isPosterSource)
    .sort((a, b) => relative(a).localeCompare(relative(b)));
}

async function runLimited(items, limit, worker) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 1, items.length));
  const results = new Array(items.length);
  let nextIndex = 0;

  await Promise.all(Array.from({ length: safeLimit }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }));

  return results;
}

function resolvePosterInput(input) {
  const absolute = path.resolve(ROOT, input);
  const postersRoot = `${path.resolve(POSTERS_DIR)}${path.sep}`;
  if (absolute !== path.resolve(POSTERS_DIR) && !absolute.startsWith(postersRoot)) {
    throw new Error(`Poster input must be inside assets/posters: ${input}`);
  }
  if (!fs.existsSync(absolute)) {
    throw new Error(`Poster input does not exist: ${input}`);
  }
  return absolute;
}

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return entry.isFile() ? [absolute] : [];
  });
}

function isPosterSource(filePath) {
  const parsed = path.parse(filePath);
  const ext = parsed.ext.toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) return false;
  return !parsed.name.endsWith(OPTIMIZED_SUFFIX);
}

async function optimizePoster(sourcePath, options) {
  const outputPath = optimizedPathFor(sourcePath);
  const sourceStat = fs.statSync(sourcePath);
  const sourceBytes = sourceStat.size;
  const outputExists = fs.existsSync(outputPath);
  const outputStat = outputExists ? fs.statSync(outputPath) : null;

  if (!options.force && outputStat && outputStat.mtimeMs >= sourceStat.mtimeMs) {
    return skipped(sourcePath, outputPath, "fresh", sourceBytes, outputStat.size);
  }

  if (!options.force && !options.all && !outputExists && sourceBytes < options.skipUnderBytes) {
    return skipped(sourcePath, outputPath, "small-source", sourceBytes, 0);
  }

  const output = await sharp(sourcePath)
    .rotate()
    .resize({
      width: options.maxWidth,
      height: options.maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    })
    .flatten({ background: "#0a0a0a" })
    .jpeg({
      quality: options.quality,
      mozjpeg: true,
    })
    .toBuffer();

  const savingPercent = sourceBytes ? ((sourceBytes - output.length) / sourceBytes) * 100 : 0;
  const requiredSaving = options.force ? 0 : options.minSavingPercent;

  if (!options.allowLarger && savingPercent < requiredSaving) {
    return skipped(sourcePath, outputPath, "not-smaller", sourceBytes, output.length);
  }

  if (!options.dryRun) {
    fs.writeFileSync(outputPath, output);
  }

  return {
    action: options.dryRun ? "would-write" : "written",
    source: relative(sourcePath),
    output: relative(outputPath),
    sourceBytes,
    outputBytes: output.length,
    savedBytes: sourceBytes - output.length,
  };
}

function optimizedPathFor(sourcePath) {
  const parsed = path.parse(sourcePath);
  return path.join(parsed.dir, `${parsed.name}${OPTIMIZED_SUFFIX}.jpg`);
}

function skipped(sourcePath, outputPath, reason, sourceBytes, outputBytes) {
  return {
    action: "skipped",
    reason,
    source: relative(sourcePath),
    output: relative(outputPath),
    sourceBytes,
    outputBytes,
    savedBytes: 0,
  };
}

function relative(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function printSummary(results, options) {
  const written = results.filter(result => result.action === "written" || result.action === "would-write");
  const skippedResults = results.filter(result => result.action === "skipped");
  const savedBytes = written.reduce((total, result) => total + result.savedBytes, 0);

  for (const result of written) {
    console.log(`${result.action}: ${result.output} (${formatBytes(result.sourceBytes)} -> ${formatBytes(result.outputBytes)})`);
  }

  const skipCounts = skippedResults.reduce((counts, result) => {
    counts[result.reason] = (counts[result.reason] || 0) + 1;
    return counts;
  }, {});

  const skipText = Object.entries(skipCounts)
    .map(([reason, count]) => `${reason}: ${count}`)
    .join(", ");

  const netText = savedBytes >= 0
    ? `${formatBytes(savedBytes)} saved`
    : `${formatBytes(Math.abs(savedBytes))} increased`;

  console.log(
    `Poster optimization complete: ${written.length} ${options.dryRun ? "would write" : "written"}, `
    + `${skippedResults.length} skipped${skipText ? ` (${skipText})` : ""}, `
    + `net ${netText}.`
  );
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}
