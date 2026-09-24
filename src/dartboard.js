const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

function point(angle, radius) {
  const radians = (angle - 90) * Math.PI / 180;
  return [150 + Math.cos(radians) * radius, 150 + Math.sin(radians) * radius];
}

function ringPath(start, end, outerRadius, innerRadius) {
  const [x1, y1] = point(start, outerRadius);
  const [x2, y2] = point(end, outerRadius);
  const [x3, y3] = point(end, innerRadius);
  const [x4, y4] = point(start, innerRadius);
  const large = end - start > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${large} 0 ${x4} ${y4} Z`;
}

function sector(value, index, outerRadius, innerRadius, ring, color) {
  const middle = index * 18;
  return `<path class="board-zone ${color}" data-board-score="${value}" data-board-ring="${ring}" d="${ringPath(middle - 9, middle + 9, outerRadius, innerRadius)}"/>`;
}

export function dartboardMarkup() {
  const rings = SECTORS.map((value, index) => {
    const alternating = index % 2 ? 'dark' : 'light';
    const wire = index % 2 ? 'green' : 'red';
    return `${sector(value, index, 140, 121, 'double', wire)}${sector(value, index, 121, 77, 'single', alternating)}${sector(value, index, 77, 59, 'triple', wire)}${sector(value, index, 59, 18, 'single', alternating)}`;
  }).join('');
  const labels = SECTORS.map((value, index) => {
    const [x, y] = point(index * 18, 153);
    return `<text x="${x}" y="${y}" class="board-number">${value}</text>`;
  }).join('');
  return `<svg class="dartboard" viewBox="0 0 300 300" role="group" aria-label="ダーツボード。各エリアをタップして入力"><circle cx="150" cy="150" r="167" class="board-surround"/>${labels}<g>${rings}</g><circle class="board-zone green" data-board-score="25" data-board-ring="outer-bull" cx="150" cy="150" r="18"/><circle class="board-zone red" data-board-score="50" data-board-ring="bull" cx="150" cy="150" r="9"/><circle cx="150" cy="150" r="140" class="board-outline"/></svg>`;
}

export function dartFromBoard(value, ring) {
  const number = Number(value);
  if (ring === 'bull') return { score: 50, hit: 'BULL' };
  if (ring === 'outer-bull') return { score: 25, hit: '25' };
  const multiplier = ring === 'double' ? 2 : ring === 'triple' ? 3 : 1;
  const prefix = multiplier === 1 ? 'S' : multiplier === 2 ? 'D' : 'T';
  return { score: number * multiplier, hit: `${prefix}${number}` };
}
