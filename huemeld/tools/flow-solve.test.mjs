import { countSolutions } from "./flow-solve.mjs";

let pass = 0, fail = 0;
function check(name, L, cap, expect) {
  const r = countSolutions(L, cap ?? 5);
  const got = r.aborted ? "aborted" : (r.capped ? `>=${r.count}` : r.count);
  const ok = r.aborted ? false : (expect.startsWith(">=") ? r.count >= +expect.slice(2) : r.count === +expect);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: got ${got} (nodes ${r.nodes}) expected ${expect}`);
  ok ? pass++ : fail++;
}

// 1) 2-cell corridor: R source -> R circle, rest walls. exactly 1.
check("corridor2", { n: 2, sq: [["R", 0, 0]], ci: [["R", 1, 0]], walls: [[0, 1], [1, 1]] }, 5, "1");

// 2) 3-cell straight corridor. exactly 1.
check("corridor3", { n: 3, sq: [["R", 0, 0]], ci: [["R", 0, 2]],
  walls: [[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]] }, 5, "1");

// 3) no field cell for a junction -> impossible. exactly 0.
check("junction-nofield", { n: 2, sq: [["R", 0, 0], ["B", 0, 1]], ci: [["P", 1, 0]], walls: [[1,1]] }, 5, "0");

// 4) proper minimal junction with a field cell for the junction.
//    (0,0)R src, (0,2)B src, (0,1) field junction, (1,1) P circle. rest walls.
check("junctionP-ok", { n: 3,
  sq: [["R",0,0],["B",0,2]], ci: [["P",1,1]],
  walls: [[1,0],[1,2],[2,0],[2,1],[2,2]] }, 5, "1");

// 5) empty 3x3, single R source + R circle diagonal corners: multiple Hamiltonian paths.
check("ham3x3-multi", { n: 3, sq: [["R", 0, 0]], ci: [["R", 2, 2]], walls: [] }, 9, ">=2");

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
