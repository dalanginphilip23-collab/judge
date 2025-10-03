import { useEffect, useState } from "react";

interface TypeCriteria {
  name?: string;
  description?: string;
  percentage?: string;
}

const CATEGORY_FESTIVAL = 0;
const CATEGORY_STREET = 1;
const contestant = [1, 2, 3, 4, 5, 6];

const festivalCriteria: TypeCriteria[] = [
  { name: "Performance Quality", description: "Precision, coordination, energy, focus, and synchronization among dancers", percentage: "25%" },
  { name: "Choreography", description: "Creativity, originality of steps, use of floor space, transitions, and group formations", percentage: "20%" },
  { name: "Theme Interpretation", description: "Clear and meaningful representation of the theme", percentage: "20%" },
  { name: "Costume & Props", description: "Appropriateness, artistry, symbolism, and how well costumes and props support the theme", percentage: "15%" },
  { name: "Musicality", description: "Rhythm, timing, and harmony of movement", percentage: "10%" },
  { name: "Overall Impact", description: "Unity, stage presence, emotional appeal, and lasting impression", percentage: "10%" },
];

const streetCriteria: TypeCriteria[] = [
  { name: "Theme/Concept", description: "Thematic interpretation, relevance and representation", percentage: "35%" },
  { name: "Choreography", description: "Creativity, artistry of movement patterns, formations, transitions", percentage: "30%" },
  { name: "Performance", description: "Execution, synchronicity, precision and projection", percentage: "25%" },
  { name: "Props and Costume", description: "Color, design, appropriateness and effectivity", percentage: "10%" },
];

export default function Home() {
  const [category, setCategory] = useState<number>(CATEGORY_FESTIVAL);
  const currentCriteria = category === CATEGORY_STREET ? streetCriteria : festivalCriteria;

  const [allJudgeScores, setAllJudgeScores] = useState<Record<number, Record<number, Record<string, string>>>>({});
  const scores = allJudgeScores[category] || {};

  const [judges, setJudges] = useState<{ id: number; name: string }[]>([]);
  const [selectedJudge, setSelectedJudge] = useState<string>("");
  const [newJudgeInput, setNewJudgeInput] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchJudges = async () => {
      try {
        const res = await fetch("https://h02pz3p9-5000.asse.devtunnels.ms/api/judges");
        const data = await res.json();
        setJudges(data);
      } catch (err) {
        console.error("Error fetching judges:", err);
      }
    };
    fetchJudges();
  }, []);

  useEffect(() => {
    const fetchScoresForCategory = async () => {
      const initialScoresForCategory: Record<number, Record<string, string>> = {};
      contestant.forEach(c => {
        initialScoresForCategory[c] = {};
        currentCriteria.forEach(crit => {
          initialScoresForCategory[c][crit.name!] = "";
        });
      });

      setAllJudgeScores(prev => ({ ...prev, [category]: initialScoresForCategory }));

      try {
        const res = await fetch(`https://h02pz3p9-5000.asse.devtunnels.ms/api/scores?category=${category}`);
        const data = await res.json();

        const transformedScores: Record<number, Record<string, string>> = { ...initialScoresForCategory };

        for (const contestantKey in data) {
          const contestantId = Number(contestantKey);
          if (!transformedScores[contestantId]) transformedScores[contestantId] = {};
          (data[contestantKey].scores || []).forEach((s: { criteria: string; score: number; judgeName: string }) => {
            if (!selectedJudge || s.judgeName === selectedJudge) {
              transformedScores[contestantId][s.criteria] = s.score.toString();
            }
          });
        }

        setAllJudgeScores(prev => ({ ...prev, [category]: transformedScores }));
      } catch (err) {
        console.error("Error fetching scores:", err);
      }
    };

    fetchScoresForCategory();
  }, [category, selectedJudge]);

  const handleChange = async (contestantNo: number, criteria: string, value: string) => {
    if (!selectedJudge) {
      alert("⚠️ Please select a judge first before entering scores.");
      return;
    }

    setAllJudgeScores(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [contestantNo]: { ...prev[category]?.[contestantNo], [criteria]: value }
      }
    }));

    try {
      await fetch("https://h02pz3p9-5000.asse.devtunnels.ms/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contestant: contestantNo,
          category,
          judgeName: selectedJudge,
          criteria,
          score: Number(value || 0) 
        }),
      });
    } catch (err) {
      console.error("Error saving score:", err);
    }
  };

  const handleAddJudge = async () => {
    const trimmed = newJudgeInput.trim();
    if (!trimmed) return;
    if (judges.some(j => j.name.toLowerCase() === trimmed.toLowerCase())) {
      alert("Judge already exists");
      return;
    }
    try {
      const res = await fetch("https://h02pz3p9-5000.asse.devtunnels.ms/api/judges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const newJudge = await res.json();
      setJudges(prev => [...prev, newJudge]);
      setSelectedJudge(newJudge.name);
      setNewJudgeInput("");
    } catch (err) {
      console.error("Error adding judge:", err);
    }
  };

  const handleSubmitScores = async () => {
    if (!selectedJudge) {
      alert("⚠️ Please select a judge first before submitting.");
      return;
    }

    try {
      for (const c of contestant) {
        for (const crit of currentCriteria) {
          const val = scores?.[c]?.[crit.name!] || "";
          if (val !== "") {
            await fetch("https://h02pz3p9-5000.asse.devtunnels.ms/api/scores", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contestant: c,
                category,
                judgeName: selectedJudge,
                criteria: crit.name,
                score: Number(val)
              }),
            });
          }
        }
      }
      alert(`✅ Scores submitted successfully for ${selectedJudge}`);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const totals = contestant.map((c) => ({
    contestant: c,
    total: currentCriteria.reduce((sum, crit) => sum + (Number(scores?.[c]?.[crit.name!] || 0)), 0),
  }));

  const ranked = [...totals].sort((a, b) => b.total - a.total);
  const ranks = ranked.reduce((acc: Record<number, number>, item, idx) => { acc[item.contestant] = idx + 1; return acc; }, {});

  return (
    <div>
      {/* Judge selector */}
      <div className="mt-3 p-4 flex flex-col sm:flex-row items-center gap-2">
        <select
          value={selectedJudge}
          onChange={(e) => setSelectedJudge(e.target.value)}
          className="border rounded px-2 py-1 w-full sm:w-auto"
        >
          <option value="">Select Judge</option>
          {judges.map((j) => <option key={j.id} value={j.name}>{j.name}</option>)}
        </select>

        <label className="flex items-center px-3 py-1 gap-2 w-full sm:w-auto flex-1 h-10 border rounded-sm">
          <input
            type="text"
            placeholder="Add new judge"
            value={newJudgeInput}
            onChange={(e) => setNewJudgeInput(e.target.value)}
            className="w-full h-full outline-0"
          />
        </label>
        <button onClick={handleAddJudge} className="submitBtn px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition">Add</button>
      </div>

      {/* Switch button */}
      <div className="px-4 mt-2">
        <button onClick={() => setCategory(category === CATEGORY_FESTIVAL ? CATEGORY_STREET : CATEGORY_FESTIVAL)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
          Switch to {category === CATEGORY_FESTIVAL ? "Street Dance Performance" : "Festival Dance Performance"}
        </button>
      </div>

      {/* Criteria Table */}
      <div className="mt-3 p-4 overflow-x-auto">
        <table className="w-full mt-2 border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Criteria</th>
              <th className="p-2">Description</th>
              <th className="p-2">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {currentCriteria.map((criteria, i) => (
              <tr key={i} className="border-b hover:bg-gray-50 transition">
                <td className="px-2 py-3 font-medium text-gray-800 text-center whitespace-nowrap">{criteria.name}</td>
                <td className="px-2 py-3 text-gray-600 text-center">{criteria.description}</td>
                <td className="px-2 py-3 text-gray-700 font-semibold text-center whitespace-nowrap">{criteria.percentage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Contestants table */}
      <div className="mt-6 px-4 overflow-x-auto border-1 rounded-lg p-2 sm:p-4">
        <h5 className="text-lg font-semibold mb-2">
          {category === CATEGORY_FESTIVAL ? "Festival Dance Performance" : "Street Dance Performance"} Scores for {selectedJudge || "Selected Judge"}
        </h5>
        <table className="min-w-full border border-gray-300 text-center rounded-sm overflow-hidden">
          <thead className="bg-green-500 text-white text-xs sm:text-sm">
            <tr>
              <th className="py-2 px-2 sm:px-6 border">Contestant No</th>
              {currentCriteria.map((c, i) => <th key={i} className="py-2 px-2 sm:px-6 border whitespace-nowrap">{c.name}</th>)}
              <th className="py-2 px-2 sm:px-6 border">Total (%)</th>
              <th className="py-2 px-2 sm:px-6 border">Rank</th>
            </tr>
          </thead>
          <tbody className="text-xs sm:text-sm">
            {contestant.map((c, i) => (
              <tr key={i} className="border-t hover:bg-green-50">
                <td className="py-2 px-2 sm:px-4 border">{c}</td>
                {currentCriteria.map((crit, j) => (
                  <td key={j} className="py-2 px-2 sm:px-4 border">
                    <select
                      value={scores?.[c]?.[crit.name!] || ""}
                      onChange={(e) => handleChange(c, crit.name!, e.target.value)}
                      className="border rounded px-1 sm:px-2 py-1 w-full text-center text-xs sm:text-sm"
                    >
                      <option value="">Select</option>
                      {[...Array(Number((crit.percentage || "0").replace("%", "")) + 1 || 0)].map((_, idx) => (
                        <option key={idx} value={idx}>{idx}</option>
                      ))}
                    </select>
                  </td>
                ))}
                <td className="py-2 px-2 sm:px-4 border font-bold">
                  {currentCriteria.reduce((sum, crit) => sum + (Number(scores?.[c]?.[crit.name!] || 0)), 0)}%
                </td>
                <td className="py-2 px-2 sm:px-4 border">{ranks[c]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Submit button */}
      <div className="mt-4 flex items-center justify-center gap-4 text-center">
        <button onClick={handleSubmitScores} className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition">
          Submit All Scores
        </button>
        {submitted && <div className="mt-2 px-4 py-2 bg-green-100 text-green-800 rounded-md font-semibold inline-block">✅ Scores submitted!</div>}
      </div>
    </div>
  );
}
