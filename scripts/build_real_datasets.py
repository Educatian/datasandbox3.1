"""Build data/realDatasets.ts from the raw Rdatasets CSVs in scripts/raw_data/.

Reproducible pipeline for the app's real-data layer (GAISE: real data with
context and purpose). Re-run after changing sampling or adding datasets:

    py scripts/build_real_datasets.py
"""
import csv
import json
from pathlib import Path

RAW = Path(__file__).parent / "raw_data"
OUT = Path(__file__).parent.parent / "data" / "realDatasets.ts"

def read(name):
    with open(RAW / name, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def sample_every_nth(rows, target):
    if len(rows) <= target:
        return rows
    step = len(rows) / target
    return [rows[int(i * step)] for i in range(target)]

def rnd(v, nd=2):
    return round(float(v), nd)

datasets = []

# 1. Galton 1886 parent-child heights (HistData::Galton, public domain)
g = read("galton.csv")
g_s = sample_every_nth(g, 150)
datasets.append({
    "id": "galton-heights",
    "kind": "bivariate",
    "name": "Galton's Heights (1886)",
    "source": "Francis Galton's 1886 family height records (HistData::Galton via Rdatasets)",
    "citation": "Galton, F. (1886). Regression towards mediocrity in hereditary stature. JRAI, 15, 246-263.",
    "year": 1886,
    "n": len(g),
    "sampled": len(g_s),
    "xLabel": "Mid-parent height", "yLabel": "Adult child height",
    "unitX": "inches", "unitY": "inches",
    "description": "The dataset that gave 'regression' its name: tall parents tend to have tall (but less extreme) children.",
    "contextNote": "Galton measured 928 adult children and their parents to study heredity. The 'regression to the mean' he found here is why the technique is called regression at all.",
    "points": [{"x": rnd(r["parent"]), "y": rnd(r["child"])} for r in g_s],
})

# 2. Old Faithful eruptions (datasets::faithful)
f = read("faithful.csv")
datasets.append({
    "id": "old-faithful",
    "kind": "bivariate",
    "name": "Old Faithful Geyser",
    "source": "272 eruptions of Old Faithful, Yellowstone (datasets::faithful via Rdatasets)",
    "citation": "Azzalini, A. & Bowman, A. W. (1990). A look at some data on the Old Faithful geyser. Applied Statistics, 39, 357-365.",
    "year": 1990,
    "n": len(f),
    "sampled": len(f),
    "xLabel": "Eruption duration", "yLabel": "Wait until next eruption",
    "unitX": "minutes", "unitY": "minutes",
    "description": "Longer eruptions are followed by longer waits - and the data splits into two clear clusters.",
    "contextNote": "Park rangers use exactly this relationship to post predicted eruption times for visitors.",
    "points": [{"x": rnd(r["eruptions"]), "y": rnd(r["waiting"])} for r in f],
})

# 3. Palmer Penguins: flipper length vs body mass (CC0)
p = [r for r in read("penguins.csv")
     if r["flipper_length_mm"] not in ("", "NA") and r["body_mass_g"] not in ("", "NA")]
p_s = sample_every_nth(p, 150)
datasets.append({
    "id": "penguins-flipper-mass",
    "kind": "bivariate",
    "name": "Palmer Penguins",
    "source": "Penguins at Palmer Station, Antarctica, 2007-2009 (palmerpenguins, CC0)",
    "citation": "Gorman, K. B., Williams, T. D., & Fraser, W. R. (2014). Ecological sexual dimorphism... PLoS ONE 9(3), e90081.",
    "year": 2014,
    "n": len(p),
    "sampled": len(p_s),
    "xLabel": "Flipper length", "yLabel": "Body mass",
    "unitX": "mm", "unitY": "g",
    "description": "Bigger flippers, heavier penguins: a strong positive association across three species.",
    "contextNote": "Collected by the Palmer Station Long Term Ecological Research program to study how penguin body condition responds to Antarctic environmental change.",
    "points": [{"x": rnd(r["flipper_length_mm"], 0), "y": rnd(r["body_mass_g"], 0)} for r in p_s],
})

# 4. mtcars: car weight vs fuel efficiency
m = read("mtcars.csv")
datasets.append({
    "id": "mtcars-wt-mpg",
    "kind": "bivariate",
    "name": "Motor Trend Cars (1974)",
    "source": "32 cars from Motor Trend US magazine, 1974 (datasets::mtcars via Rdatasets)",
    "citation": "Henderson, H. V. & Velleman, P. F. (1981). Building multiple regression models interactively. Biometrics, 37, 391-411.",
    "year": 1974,
    "n": len(m),
    "sampled": len(m),
    "xLabel": "Car weight", "yLabel": "Fuel efficiency",
    "unitX": "1000 lbs", "unitY": "mpg",
    "description": "Heavier cars burn more fuel: a clean negative correlation from real road tests.",
    "contextNote": "Published during the 1970s oil crisis, when fuel efficiency suddenly became a question every car buyer asked.",
    "points": [{"x": rnd(r["wt"]), "y": rnd(r["mpg"], 1)} for r in m],
})

# 5. Penguins flipper length by species (grouped, for ANOVA)
species = {}
for r in p:
    species.setdefault(r["species"], []).append(round(float(r["flipper_length_mm"])))
datasets.append({
    "id": "penguins-flipper-by-species",
    "kind": "grouped",
    "name": "Penguin Flippers by Species",
    "source": "Palmer Penguins, Antarctica 2007-2009 (palmerpenguins, CC0)",
    "citation": "Gorman, K. B., Williams, T. D., & Fraser, W. R. (2014). PLoS ONE 9(3), e90081.",
    "year": 2014,
    "n": len(p),
    "sampled": len(p),
    "xLabel": "Flipper length", "unitX": "mm",
    "description": "Do Adelie, Chinstrap, and Gentoo penguins really have different flipper lengths? A real one-way ANOVA question.",
    "contextNote": "Three penguin species share the same Antarctic peninsula; their measurable differences are textbook between-group variance.",
    "groups": [{"label": k, "values": v} for k, v in sorted(species.items())],
})

# 6. Michelson speed-of-light experiments (grouped)
mo = read("morley.csv")
expts = {}
for r in mo:
    expts.setdefault(f"Experiment {r['Expt']}", []).append(int(r["Speed"]))
datasets.append({
    "id": "michelson-speed",
    "kind": "grouped",
    "name": "Michelson's Speed of Light (1879)",
    "source": "100 measurements in 5 experiments (datasets::morley via Rdatasets). Values are km/s minus 299,000.",
    "citation": "Michelson, A. A. (1882). Experimental determination of the velocity of light. Astronomical Papers, 1, 109-145.",
    "year": 1879,
    "n": len(mo),
    "sampled": len(mo),
    "xLabel": "Speed (km/s - 299,000)", "unitX": "km/s offset",
    "description": "One of history's most famous measurement campaigns: 100 attempts to pin down the speed of light, spread and all.",
    "contextNote": "The true value is about 299,792 km/s (i.e., 792 on this scale). Measurement variability is not failure: it is the reason statistics exists.",
    "groups": [{"label": k, "values": v} for k, v in sorted(expts.items())],
})

# 7. Titanic: class x survival (contingency)
t = read("titanic.csv")
classes = ["1st", "2nd", "3rd", "Crew"]
counts = {c: {"No": 0, "Yes": 0} for c in classes}
for r in t:
    counts[r["Class"]][r["Survived"]] += int(r["Freq"])
datasets.append({
    "id": "titanic-class-survival",
    "kind": "contingency",
    "name": "Titanic Survival by Class (1912)",
    "source": "All 2,201 people aboard RMS Titanic (datasets::Titanic via Rdatasets)",
    "citation": "Dawson, R. J. M. (1995). The 'unusual episode' data revisited. Journal of Statistics Education, 3(3).",
    "year": 1912,
    "n": 2201,
    "sampled": 2201,
    "description": "Was survival independent of ticket class? The chi-square question behind one of history's most studied disasters.",
    "contextNote": "Published in the Journal of Statistics Education itself as a teaching dataset. Each count is a person; treat the conclusion with the gravity it deserves.",
    "rowLabels": classes,
    "colLabels": ["Died", "Survived"],
    "counts": [[counts[c]["No"], counts[c]["Yes"]] for c in classes],
})

# 8. Challenger O-rings (binary outcome, for logistic regression)
o = read("orings.csv")
datasets.append({
    "id": "challenger-orings",
    "kind": "binary",
    "name": "Challenger O-Rings (1986)",
    "source": "23 shuttle launches before the Challenger disaster (DAAG::orings via Rdatasets)",
    "citation": "Dalal, S. R., Fowlkes, E. B., & Hoadley, B. (1989). Risk analysis of the space shuttle. JASA, 84, 945-957.",
    "year": 1986,
    "n": len(o),
    "sampled": len(o),
    "xLabel": "Launch temperature", "unitX": "deg F",
    "description": "Did cold launches damage O-rings? The logistic regression that, done in time, might have stopped the launch.",
    "contextNote": "Challenger launched at 31 deg F, far below every previous flight. Engineers had this data the night before. It is the canonical case for why extrapolating - and ignoring - a fitted curve matters.",
    "points": [{"x": int(r["Temperature"]), "outcome": 1 if int(r["Total"]) > 0 else 0} for r in o],
})

# 9. Gapminder 2007: GDP per capita vs life expectancy (CC-BY)
gm = read("gapminder.csv")
gm07 = [r for r in gm if r["year"] == "2007"]
datasets.append({
    "id": "gapminder-2007",
    "kind": "bivariate",
    "name": "Gapminder: Wealth & Health (2007)",
    "source": "142 countries, Gapminder Foundation (gapminder via Rdatasets, CC-BY)",
    "citation": "Bryan, J. (2017). gapminder: Data from Gapminder. Data from gapminder.org, originally compiled by Hans Rosling's Gapminder Foundation.",
    "year": 2007,
    "n": len(gm07),
    "sampled": len(gm07),
    "xLabel": "GDP per capita", "yLabel": "Life expectancy",
    "unitX": "USD", "unitY": "years",
    "description": "Hans Rosling's famous chart: richer countries live longer, but the relationship is curved, not linear.",
    "contextNote": "Every point is a whole country. Notice how a straight line fits poorly: most of the action happens below $10,000, a classic case for thinking beyond linearity.",
    "points": [{"x": rnd(r["gdpPercap"], 0), "y": rnd(r["lifeExp"], 1)} for r in gm07],
})

# 10. Gapminder life expectancy by continent (grouped, for ANOVA)
continents = {}
for r in gm07:
    continents.setdefault(r["continent"], []).append(round(float(r["lifeExp"]), 1))
datasets.append({
    "id": "gapminder-lifeexp-by-continent",
    "kind": "grouped",
    "name": "Life Expectancy by Continent (2007)",
    "source": "142 countries grouped by continent, Gapminder Foundation (CC-BY)",
    "citation": "Bryan, J. (2017). gapminder: Data from Gapminder. Data from gapminder.org / Gapminder Foundation.",
    "year": 2007,
    "n": len(gm07),
    "sampled": len(gm07),
    "xLabel": "Life expectancy", "unitX": "years",
    "description": "Do continents differ in average life expectancy? Real between-group differences with very real consequences.",
    "contextNote": "Group differences here reflect global health inequality, not biology: access to medicine, sanitation, conflict, and wealth.",
    "groups": [{"label": k, "values": v} for k, v in sorted(continents.items())],
})

# 11. UN: national wealth vs infant mortality (carData::UN)
un = [r for r in read("un.csv")
      if r["ppgdp"] not in ("", "NA") and r["infantMortality"] not in ("", "NA")]
datasets.append({
    "id": "un-infant-mortality",
    "kind": "bivariate",
    "name": "UN: Wealth & Infant Mortality (2011)",
    "source": f"{len(un)} UN member states (carData::UN via Rdatasets)",
    "citation": "United Nations (2011), national statistics compiled in Fox & Weisberg, An R Companion to Applied Regression (carData).",
    "year": 2011,
    "n": len(un),
    "sampled": len(un),
    "xLabel": "GDP per capita", "yLabel": "Infant mortality",
    "unitX": "USD", "unitY": "deaths per 1,000 births",
    "description": "A strong negative, sharply curved relationship: small income gains in poor countries matter enormously.",
    "contextNote": "Each point summarizes thousands of real births and deaths. The curvature is the statistical signature of diminishing returns to national income.",
    "points": [{"x": rnd(r["ppgdp"], 0), "y": rnd(r["infantMortality"], 1)} for r in un],
})

# 12. Fiji earthquakes: depth vs magnitude (datasets::quakes)
q = read("quakes.csv")
q_s = sample_every_nth(q, 150)
datasets.append({
    "id": "quakes-fiji",
    "kind": "bivariate",
    "name": "Fiji Earthquakes",
    "source": "1,000 seismic events near Fiji since 1964 (datasets::quakes via Rdatasets)",
    "citation": "Harvard PRIM-H project / Dr. John Woodhouse, Dept. of Geophysics, Harvard University.",
    "year": 1964,
    "n": len(q),
    "sampled": len(q_s),
    "xLabel": "Depth", "yLabel": "Magnitude",
    "unitX": "km", "unitY": "Richter",
    "description": "1,000 real earthquakes from one of the most seismically active regions on Earth. Is depth related to magnitude?",
    "contextNote": "The Tonga trench produces both shallow and very deep quakes. A near-zero correlation is itself a finding worth trusting.",
    "points": [{"x": int(r["depth"]), "y": rnd(r["mag"], 1)} for r in q_s],
})

# 13. Swiss fertility vs education, 1888 (datasets::swiss)
sw = read("swiss.csv")
datasets.append({
    "id": "swiss-fertility",
    "kind": "bivariate",
    "name": "Swiss Fertility & Education (1888)",
    "source": "47 French-speaking Swiss provinces, 1888 census (datasets::swiss via Rdatasets)",
    "citation": "Mosteller, F. & Tukey, J. W. (1977). Data Analysis and Regression. Addison-Wesley (Project: 1888 Swiss demographic data).",
    "year": 1888,
    "n": len(sw),
    "sampled": len(sw),
    "xLabel": "Education beyond primary school", "yLabel": "Standardized fertility",
    "unitX": "% of draftees", "unitY": "Ig index",
    "description": "A 19th-century demographic transition caught in the act: more education, fewer births.",
    "contextNote": "Collected during Switzerland's demographic transition. Correlation here is entangled with religion, region, and wealth: a gateway to confounding.",
    "points": [{"x": rnd(r["Education"], 0), "y": rnd(r["Fertility"], 1)} for r in sw],
})

# --- Emit TypeScript ---
header = """// AUTO-GENERATED by scripts/build_real_datasets.py - do not edit by hand.
// Curated open datasets for the real-data layer (GAISE 2016 Rec 3:
// "integrate real data with context and purpose"). All sources are
// public-domain or CC0 classics distributed via Rdatasets.

export interface RealDatasetBase {
    id: string;
    kind: 'bivariate' | 'grouped' | 'contingency' | 'binary';
    name: string;
    source: string;
    citation: string;
    year: number;
    /** Size of the original dataset */
    n: number;
    /** Number of records embedded here (deterministic every-nth sample) */
    sampled: number;
    description: string;
    contextNote: string;
    xLabel?: string;
    yLabel?: string;
    unitX?: string;
    unitY?: string;
}

export interface BivariateDataset extends RealDatasetBase {
    kind: 'bivariate';
    points: { x: number; y: number }[];
}

export interface GroupedDataset extends RealDatasetBase {
    kind: 'grouped';
    groups: { label: string; values: number[] }[];
}

export interface ContingencyDataset extends RealDatasetBase {
    kind: 'contingency';
    rowLabels: string[];
    colLabels: string[];
    counts: number[][];
}

export interface BinaryOutcomeDataset extends RealDatasetBase {
    kind: 'binary';
    points: { x: number; outcome: 0 | 1 }[];
}

export type RealDataset = BivariateDataset | GroupedDataset | ContingencyDataset | BinaryOutcomeDataset;

"""

body = "export const REAL_DATASETS: RealDataset[] = " + json.dumps(datasets, indent=2) + " as RealDataset[];\n"

footer = """
export const getDataset = (id: string): RealDataset | undefined =>
    REAL_DATASETS.find(d => d.id === id);

export const bivariateDatasets = (): BivariateDataset[] =>
    REAL_DATASETS.filter((d): d is BivariateDataset => d.kind === 'bivariate');

/** Linearly rescale bivariate points into a target viewport (e.g. the 0-100
 *  coordinate space the simulations draw in), with a small margin. r and the
 *  visual pattern are unaffected by linear rescaling. */
export const scalePointsToViewport = (
    points: { x: number; y: number }[],
    min = 5,
    max = 95
): { x: number; y: number }[] => {
    if (points.length === 0) return [];
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    const span = max - min;
    return points.map(p => ({
        x: xMax === xMin ? (min + max) / 2 : min + ((p.x - xMin) / (xMax - xMin)) * span,
        y: yMax === yMin ? (min + max) / 2 : min + ((p.y - yMin) / (yMax - yMin)) * span,
    }));
};
"""

OUT.parent.mkdir(exist_ok=True)
OUT.write_text(header + body + footer, encoding="utf-8", newline="\n")
print(f"Wrote {OUT} ({OUT.stat().st_size} bytes, {len(datasets)} datasets)")
for d in datasets:
    size = d.get("sampled")
    print(f"  - {d['id']} ({d['kind']}, n={d['n']}, embedded={size})")
