import { useState, useEffect } from "react";

interface Score {
  contestant_id: number;
  street_total: number;   // total for street dance
  festival_total: number; // total for festival dance
  judgeName?: string;     // optional judge name
}

export default function ScoresData() {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  const MAX_STREET = 100;
  const MAX_FESTIVAL = 100;

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const res = await fetch("https://h02pz3p9-5000.asse.devtunnels.ms/api/raw-scores");
        const data = await res.json();
        setScores(data);
      } catch (err) {
        console.error("Error fetching scores:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, []);

  const results = scores.map((item) => {
    const street_percentage =
      MAX_STREET > 0 ? (item.street_total / MAX_STREET) * 100 : 0;
    const festival_percentage =
      MAX_FESTIVAL > 0 ? (item.festival_total / MAX_FESTIVAL) * 100 : 0;

    const finalScore =
      street_percentage * 0.4 + festival_percentage * 0.6;

    return {
      contestant: item.contestant_id,
      street_percentage: street_percentage.toFixed(2),
      festival_percentage: festival_percentage.toFixed(2),
      finalScore: finalScore.toFixed(2),
      street_total: item.street_total,
      festival_total: item.festival_total,
      judgeName: item.judgeName || "N/A",
    };
  }).sort((a, b) => Number(b.finalScore) - Number(a.finalScore));

  const ranks = results.reduce((acc: Record<number, number>, item, idx) => {
    acc[item.contestant] = idx + 1;
    return acc;
  }, {});

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4 flex flex-col gap-6">
      {/* Main Scoreboard */}
      <h1 className="text-2xl font-bold mb-4">Score</h1>
      <div className="overflow-x-auto border border-gray-300 rounded-md">
        <table className="min-w-full text-center">
          <thead className="bg-yellow-500 text-white text-sm">
            <tr>
              <th className="py-2 px-2 border">Contestant</th>
              <th className="py-2 px-2 border">Street Dance 40%</th>
              <th className="py-2 px-2 border">Actual Dance 60%</th>
              <th className="py-2 px-2 border">Final Score</th>
              <th className="py-2 px-2 border">Rank</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {results.map((item) => (
              <tr key={item.contestant} className="border-t hover:bg-yellow-50">
                <td className="py-2 px-2 border">{item.contestant}</td>
                <td className="py-2 px-2 border">{item.street_percentage}%</td>
                <td className="py-2 px-2 border">{item.festival_percentage}%</td>
                <td className="py-2 px-2 border font-bold">{item.finalScore}%</td>
                <td className="py-2 px-2 border">{ranks[item.contestant]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Raw Data Table */}
      <h2 className="text-xl font-bold mt-6 mb-2">All Raw Data</h2>
      <div className="overflow-x-auto border border-gray-300 rounded-md max-h-96">
        <table className="min-w-full text-center">
          <thead className="bg-gray-700 text-white text-sm sticky top-0">
            <tr>
              <th className="py-2 px-2 border">Contestant</th>
              <th className="py-2 px-2 border">Street Total</th>
              <th className="py-2 px-2 border">Festival Total</th>
              <th className="py-2 px-2 border">Judge Name</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {results.map((item) => (
              <tr key={`${item.contestant}-${item.judgeName}`} className="border-t hover:bg-gray-100">
                <td className="py-2 px-2 border">{item.contestant}</td>
                <td className="py-2 px-2 border">{item.street_total}</td>
                <td className="py-2 px-2 border">{item.festival_total}</td>
                <td className="py-2 px-2 border">{item.judgeName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
