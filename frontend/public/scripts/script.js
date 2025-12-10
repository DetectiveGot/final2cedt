// Imports
import { getItems, createItem, updateItem, deleteItem, generateLLM } from "./api.js";

let quizData = []; 
let currentQuizId = null; 
let combinedQuestions = []; 
let currentQuestionIndex = 0;
let scoreX = 0;
let scoreY = 0;
let answerHistory = [];

// Creator view state
let editingQuizId = null;
let customEmotionQuestions = [];
let customAppearanceQuestions = [];
let customQuizResults = [];

// DOM buckets (assigned on DOMContentLoaded)
let views = {};
let loadingOverlay = null;

// Utilities
const getById = (id) => quizData.find(q => q._id === id);

function setViews() {
  views = {
    category: document.getElementById('category-selection-view'),
    management: document.getElementById('management-view'),
    quiz: document.getElementById('quiz-view'),
    result: document.getElementById('result-view'),
    creator: document.getElementById('creator-view'),
  };
  loadingOverlay = document.getElementById('loading-overlay');
}

function switchView(viewName) {
  Object.values(views).forEach(v => v && v.classList.remove('active'));
  if (views[viewName]) views[viewName].classList.add('active');
}

function goHome() {
  currentQuizId = null;
  currentQuestionIndex = 0;
  scoreX = 0;
  scoreY = 0;
  answerHistory = [];
  combinedQuestions = [];
  editingQuizId = null;

  renderCategorySelection();
  switchView('category');
}

// Category List
function renderCategorySelection() {
  const categoryList = document.getElementById('category-list');
  categoryList.innerHTML = '';

  if (!Array.isArray(quizData) || quizData.length === 0) {
    categoryList.innerHTML = '<p class="text-center text-muted">ยังไม่มีแบบทดสอบ... ลองสร้างของคุณเองสิ!</p>';
    return;
  }

  for (const q of quizData) {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.innerText = q.title ?? 'Untitled';
    btn.addEventListener('click', () => startQuiz(q._id));
    categoryList.appendChild(btn);
  }
}

// Management View
function showManagementView() {
  renderManagementList();
  switchView('management');
}

function renderManagementList() {
  const listContainer = document.getElementById('quiz-management-list');
  listContainer.innerHTML = '';

  if (!quizData.length) {
    listContainer.innerHTML = '<p class="text-center text-muted">ยังไม่มีแบบทดสอบให้จัดการ</p>';
    return;
  }

  quizData.forEach((quiz) => {
    const item = document.createElement('div');
    item.className = 'creator-question-item';
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';

    const title = document.createElement('p');
    title.style.margin = '0';
    title.style.fontWeight = '600';
    title.textContent = quiz.title;

    const actions = document.createElement('div');

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.title = 'แก้ไข';
    editBtn.innerHTML = '&#9998;';
    editBtn.addEventListener('click', () => {
      editQuiz(quiz._id)
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.title = 'ลบ';
    delBtn.innerHTML = '&times;';
    delBtn.addEventListener('click', () => onDeleteQuiz(quiz._id, quiz.title));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    item.appendChild(title);
    item.appendChild(actions);
    listContainer.appendChild(item);
  });
}

async function onDeleteQuiz(id, title) {
  const ok = confirm(`คุณต้องการลบแบบทดสอบ "${title}" ใช่หรือไม่?`);
  if (!ok) return;
  await deleteItem(id);
  quizData = await getItems();
  renderManagementList();
  renderCategorySelection();
}

// Creator View
function showNewCreatorView() {
  editingQuizId = null;
  document.getElementById('creator-view-title').innerText = "สร้างแบบทดสอบของคุณ";
  document.getElementById('category-name-input').value = '';
  customEmotionQuestions = [];
  customAppearanceQuestions = [];
  customQuizResults = [];
  renderAllCreatorLists();
  switchView('creator');
}

function editQuiz(id) {
  editingQuizId = id;
  const quizToEdit = getById(id);
  if (!quizToEdit) return;

  document.getElementById('creator-view-title').innerText = `แก้ไข: ${quizToEdit.title}`;
  document.getElementById('category-name-input').value = quizToEdit.title;

  customEmotionQuestions    = JSON.parse(JSON.stringify(quizToEdit.questions?.emotion    ?? []));
  customAppearanceQuestions = JSON.parse(JSON.stringify(quizToEdit.questions?.appearance ?? []));
  customQuizResults         = JSON.parse(JSON.stringify(quizToEdit.results               ?? []));
  renderAllCreatorLists();
  switchView('creator');
}

function addManualQuestion(type) {
  const qLabel = type === 'emotion' ? 'อารมณ์' : 'รูปลักษณ์';
  const newQuestion = {
    question: `คำถามใหม่ (${qLabel})`,
    answers: [
      { text: "คำตอบ 1", points: 1 },
      { text: "คำตอบ 2", points: 2 },
      { text: "คำตอบ 3", points: 3 },
      { text: "คำตอบ 4", points: 4 },
    ],
  };
  if (type === 'emotion') customEmotionQuestions.push(newQuestion);
  else customAppearanceQuestions.push(newQuestion);

  renderAllCreatorLists();
}

function renderAllCreatorLists() {
  renderCreatorQuestions('emotion', customEmotionQuestions, document.getElementById('emotion-questions-list'));
  renderCreatorQuestions('appearance', customAppearanceQuestions, document.getElementById('appearance-questions-list'));
  renderCreatorResults();
}

function renderCreatorQuestions(type, questionsArray, container) {
  container.innerHTML = '';
  if (questionsArray.length === 0) {
    container.innerHTML = `<p class="text-center text-muted" style="font-size: 0.875rem;">ยังไม่มีคำถามหมวดนี้...</p>`;
    return;
  }

  questionsArray.forEach((q, index) => {
    const item = document.createElement('div');
    item.className = `creator-question-item ${type}`;

    const header = document.createElement('div');
    header.className = 'creator-question-item-header';

    const ta = document.createElement('textarea');
    ta.className = 'form-control';
    ta.rows = 2;
    ta.value = q.question;
    ta.addEventListener('input', (e) => updateCreatorQuestionText(type, index, e.target.value));

    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.innerHTML = '&times;';
    del.addEventListener('click', () => deleteCreatorQuestion(type, index));

    header.appendChild(ta);
    header.appendChild(del);

    const answersWrap = document.createElement('div');
    answersWrap.style.marginTop = '1rem';

    q.answers.forEach((a, ansIndex) => {
      const group = document.createElement('div');
      group.className = 'input-group';
      group.style.marginBottom = '0.5rem';

      const inputText = document.createElement('input');
      inputText.type = 'text';
      inputText.className = 'form-control';
      inputText.value = a.text;
      inputText.addEventListener('input', (e) => updateCreatorAnswer(type, index, ansIndex, 'text', e.target.value));

      const inputPoints = document.createElement('input');
      inputPoints.type = 'number';
      inputPoints.className = 'form-control';
      inputPoints.style.maxWidth = '70px';
      inputPoints.value = a.points;
      inputPoints.addEventListener('input', (e) => {
        const v = parseInt(e.target.value, 10);
        updateCreatorAnswer(type, index, ansIndex, 'points', Number.isNaN(v) ? 0 : v);
      });

      group.appendChild(inputText);
      group.appendChild(inputPoints);
      answersWrap.appendChild(group);
    });

    item.appendChild(header);
    item.appendChild(answersWrap);
    container.appendChild(item);
  });
}

function updateCreatorQuestionText(type, index, newText) {
  const arr = type === 'emotion' ? customEmotionQuestions : customAppearanceQuestions;
  if (arr[index]) arr[index].question = newText;
}

function updateCreatorAnswer(type, qIndex, aIndex, field, value) {
  const arr = type === 'emotion' ? customEmotionQuestions : customAppearanceQuestions;
  if (arr[qIndex] && arr[qIndex].answers[aIndex]) {
    arr[qIndex].answers[aIndex][field] = value;
  }
}

function deleteCreatorQuestion(type, index) {
  const arr = type === 'emotion' ? customEmotionQuestions : customAppearanceQuestions;
  arr.splice(index, 1);
  renderAllCreatorLists();
}

function renderCreatorResults() {
  const listContainer = document.getElementById('result-creator-list');
  listContainer.innerHTML = '';
  if (customQuizResults.length === 0) {
    listContainer.innerHTML = '<p class="text-center text-muted" style="font-size: 0.875rem;">ยังไม่มีผลลัพธ์...</p>';
    return;
  }

  customQuizResults.forEach((r, index) => {
    const item = document.createElement('div');
    item.className = 'creator-question-item';

    const header = document.createElement('div');
    header.className = 'creator-question-item-header';

    const left = document.createElement('div');
    const title = document.createElement('p');
    title.style.fontWeight = '600';
    title.style.margin = 0;
    title.textContent = r.title;

    const code = document.createElement('code');
    code.style.fontSize = '0.8em';
    code.textContent = `X ${r.condition_x.op} ${r.condition_x.val}, Y ${r.condition_y.op} ${r.condition_y.val}`;

    left.appendChild(title);
    left.appendChild(code);

    const actions = document.createElement('div');
    const edit = document.createElement('button');
    edit.className = 'edit-btn';
    edit.innerHTML = '&#9998;';
    edit.addEventListener('click', () => editCreatorResult(index));

    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.innerHTML = '&times;';
    del.addEventListener('click', () => deleteCreatorResult(index));

    actions.appendChild(edit);
    actions.appendChild(del);

    header.appendChild(left);
    header.appendChild(actions);
    item.appendChild(header);

    listContainer.appendChild(item);
  });
}

function editCreatorResult(index) {
  const r = customQuizResults[index];
  if (!r) return;

  document.getElementById('manual-result-title').value = r.title ?? '';
  document.getElementById('manual-result-desc').value  = r.description ?? '';
  document.getElementById('manual-result-image').value = r.imageUrl ?? '';
  document.getElementById('condition-x-op').value      = r.condition_x?.op ?? '<=';
  document.getElementById('condition-x-val').value     = r.condition_x?.val ?? 0;
  document.getElementById('condition-y-op').value      = r.condition_y?.op ?? '<=';
  document.getElementById('condition-y-val').value     = r.condition_y?.val ?? 0;
  document.getElementById('editing-result-index').value = index;
  document.getElementById('manual-result-title').focus();
}

function deleteCreatorResult(index) {
  customQuizResults.splice(index, 1);
  renderCreatorResults();
}

function resetResultForm() {
  const form = document.getElementById('manual-result-form');
  form.querySelectorAll('input, textarea, select').forEach(el => {
    if (el.id === 'editing-result-index') el.value = -1;
    else if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
  document.getElementById('editing-result-index').value = -1;
}

function addOrUpdateManualResult() {
  const title = document.getElementById('manual-result-title').value.trim();
  const description = document.getElementById('manual-result-desc').value.trim();
  const imageUrl = document.getElementById('manual-result-image').value.trim();
  const condition_x = {
    op: document.getElementById('condition-x-op').value,
    val: parseInt(document.getElementById('condition-x-val').value, 10)
  };
  const condition_y = {
    op: document.getElementById('condition-y-op').value,
    val: parseInt(document.getElementById('condition-y-val').value, 10)
  };
  const editingIndex = parseInt(document.getElementById('editing-result-index').value, 10);

  if (!title || !description || Number.isNaN(condition_x.val) || Number.isNaN(condition_y.val)) {
    alert("กรุณากรอกข้อมูลผลลัพธ์และเงื่อนไขให้ครบถ้วน");
    return;
  }
  const newResult = { title, description, imageUrl, condition_x, condition_y };
  if (editingIndex > -1) customQuizResults[editingIndex] = newResult;
  else customQuizResults.push(newResult);

  renderCreatorResults();
  resetResultForm();
}

// async function generateImageForCurrentResult(event) {
//   event.preventDefault();
//   const title = document.getElementById('manual-result-title').value.trim();
//   if (!title) {
//     alert('กรุณาใส่ "ชื่อผลลัพธ์" ก่อนสร้างรูปภาพ');
//     return;
//   }
//   loadingOverlay.style.display = 'flex';
//   try {
//     const imageUrl = await generateImage(title);
//     const imageInput = document.getElementById('manual-result-image');
//     imageInput.value = imageUrl;

//     const genBtn = event.currentTarget;
//     const originalText = genBtn.innerHTML;
//     genBtn.innerHTML = 'สร้างแล้ว!';
//     genBtn.disabled = true;
//     setTimeout(() => {
//       genBtn.innerHTML = originalText;
//       genBtn.disabled = false;
//     }, 1500);
//   } catch(err) {
//     console.log("Image gen error: ", err);
//   } finally {
//     loadingOverlay.style.display = 'none';
//   }
// }
  

async function generateWithLLM(type) {
  const categoryName = document.getElementById('category-name-input').value.trim();
  if (!categoryName) { alert('กรุณาใส่ชื่อแบบทดสอบก่อน'); return; }
  if(type==="results" && (customEmotionQuestions.length < 1 || customAppearanceQuestions.length < 1)) {
    alert('ต้องมีคำถามอารมณ์และรูปลักษณ์อย่างน้อย 1 ข้อ');
    return
  }
  const maxScoreX = customEmotionQuestions.reduce((sum, q) => sum + Math.max(...q.answers.map(a => a.points)), 0);
  const maxScoreY = customAppearanceQuestions.reduce((sum, q) => sum + Math.max(...q.answers.map(a => a.points)), 0);

  loadingOverlay.style.display = 'block';
  try {
    const resp = await generateLLM({type, maxScoreX, maxScoreY, categoryName})
    // console.log(resp);
    if(!resp) {
      alert("Bad response.");
      return;
    }
    const result = resp;
    let generatedText = result.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsedJson = JSON.parse(generatedText);

    if (type === 'emotion_questions') customEmotionQuestions.push(...parsedJson);
    else if (type === 'appearance_questions') customAppearanceQuestions.push(...parsedJson);
    else if (type === 'results') {
      for(let item of parsedJson) {
        item.imageUrl = `https://placehold.co/600x400/cccccc/ffffff?text=${item.title}`;
      }
      console.log(parsedJson);
      customQuizResults = parsedJson;
    }

    renderAllCreatorLists();
  } catch (err) {
    console.error("LLM error:", err);
    alert("เกิดข้อผิดพลาดในการสร้างข้อมูล: " + err.message);
  } finally {
    loadingOverlay.style.display = 'flex';
  }
}

async function postCustomQuiz() {
  const title = document.getElementById('category-name-input').value.trim();
  if (!title) { alert('กรุณาตั้งชื่อแบบทดสอบ'); return; }
  if (!customEmotionQuestions.length || !customAppearanceQuestions.length) { alert('กรุณาสร้างคำถามทั้งสองหมวดหมู่อย่างน้อย 1 ข้อ'); return; }
  if (customQuizResults.length < 4) { alert('กรุณาสร้างผลลัพธ์ให้ครบทั้ง 4 แบบ'); return; }

  const payload = {
    title,
    questions: { emotion: customEmotionQuestions, appearance: customAppearanceQuestions },
    results: customQuizResults
  };
  // console.log("EDITING QUIZ?: ", editingQuizId)
  try {
    loadingOverlay.style.display = 'flex';
    if(editingQuizId) {
      const item = await updateItem(editingQuizId, payload);
      const pos = quizData.findIndex((it) => it._id===editingQuizId);
      if(pos!==-1) quizData[pos]=item;
      console.log("EDITING ID: ", editingQuizId);
      editingQuizId = null;
    } else {
      const created = await createItem(payload);
      quizData.push(created); // keep local list in sync
      alert('บันทึกแบบทดสอบสำเร็จ!');
    }
    showManagementView();
    renderCategorySelection();
  } catch (e) {
    console.error(e);
    alert('บันทึกไม่สำเร็จ: ' + e.message);
  } finally {
    loadingOverlay.style.display = 'none';
  }
}


// ------------------------------------------------------------
// Quiz Flow
function startQuiz(id) {
  currentQuizId = id;
  currentQuestionIndex = 0;
  scoreX = 0;
  scoreY = 0;
  answerHistory = [];

  const quiz = getById(id);
  if (!quiz) { alert('ไม่พบแบบทดสอบนี้'); return; }

  document.getElementById('quiz-category-title').innerText = quiz.title ?? 'Quiz';

  combinedQuestions = [
    ...(quiz.questions?.emotion ?? []).map(q => ({ ...q, type: 'emotion' })),
    ...(quiz.questions?.appearance ?? []).map(q => ({ ...q, type: 'appearance' })),
  ];

  if (!combinedQuestions.length) {
    alert("แบบทดสอบนี้ยังไม่มีคำถาม");
    return;
  }

  renderQuestion();
  switchView('quiz');
}

function renderQuestion() {
  if (currentQuestionIndex >= combinedQuestions.length) {
    showResult();
    return;
  }

  const q = combinedQuestions[currentQuestionIndex];
  document.getElementById('prev-question-btn').style.visibility =
    (currentQuestionIndex === 0) ? 'hidden' : 'visible';
  document.getElementById('question-text').innerText =
    `(${q.type === 'emotion' ? 'อารมณ์' : 'รูปลักษณ์'}) ${q.question}`;

  const answersContainer = document.getElementById('answers-container');
  answersContainer.innerHTML = '';

  (q.answers ?? []).forEach(a => {
    const btn = document.createElement('button');
    btn.className = "btn btn-answer";
    btn.innerText = a.text;
    btn.addEventListener('click', () => selectAnswer(q.type, a.points));
    answersContainer.appendChild(btn);
  });
}

function selectAnswer(type, points) {
  let x = 0, y = 0;
  if (type === 'emotion') { scoreX += points; x = points; }
  else { scoreY += points; y = points; }

  answerHistory.push({ x, y });
  currentQuestionIndex++;
  renderQuestion();
}

function previousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    const last = answerHistory.pop();
    if (last) { scoreX -= last.x; scoreY -= last.y; }
    renderQuestion();
  }
}

function showResult() {
  const quiz = getById(currentQuizId);
  if (!quiz) { alert('ไม่พบแบบทดสอบนี้'); return; }

  const results = quiz.results ?? [];
  let finalResult = null;

  for (const r of results) {
    const cx = r.condition_x, cy = r.condition_y;
    if (!cx || !cy) continue;
    const matchX = (cx.op === '<=') ? (scoreX <= cx.val) : (scoreX > cx.val);
    const matchY = (cy.op === '<=') ? (scoreY <= cy.val) : (scoreY > cy.val);
    if (matchX && matchY) { finalResult = r; break; }
  }

  if (!finalResult) {
    finalResult = {
      title: "ไม่พบผลลัพธ์",
      description: `คะแนนของคุณคือ อารมณ์: ${scoreX}, รูปลักษณ์: ${scoreY}`,
      imageUrl: ''
    };
  }

  document.getElementById('result-title').innerText = finalResult.title ?? '';
  document.getElementById('result-description').innerText = finalResult.description ?? '';
  const resultImage = document.getElementById('result-image');
  if (finalResult.imageUrl) {
    resultImage.src = finalResult.imageUrl;
    resultImage.style.display = 'block';
  } else {
    resultImage.style.display = 'none';
  }
  switchView('result');
}

// ------------------------------------------------------------
// Bind UI events
function bindUI() {
  // Top-level navigation
  document.querySelectorAll(".show-man-view").forEach(el => el.addEventListener("click", showManagementView));
  document.querySelectorAll(".to-home-btn").forEach(el => el.addEventListener("click", goHome));

  const addTestBtn = document.getElementById("add-new-test");
  if (addTestBtn) addTestBtn.addEventListener("click", showNewCreatorView);

  const prevBtn = document.getElementById("prev-question-btn");
  if (prevBtn) prevBtn.addEventListener("click", previousQuestion);

  // Creator controls
  const inputEmotion = document.getElementById("input-emotion");
  if (inputEmotion) inputEmotion.addEventListener("click", () => addManualQuestion('emotion'));

  const inputAppearance = document.getElementById("input-appearance");
  if (inputAppearance) inputAppearance.addEventListener("click", () => addManualQuestion('appearance'));

  const genEmotion = document.getElementById("gen-emotion");
  if (genEmotion) genEmotion.addEventListener("click", () => generateWithLLM('emotion_questions'));

  const genAppearance = document.getElementById("gen-appearance");
  if (genAppearance) genAppearance.addEventListener("click", () => generateWithLLM('appearance_questions'));

  const genResult = document.getElementById("gen-result");
  if (genResult) genResult.addEventListener("click", () => generateWithLLM('results'));

  // const genImage = document.getElementById("gen-image");
  // if (genImage) genImage.addEventListener("click", generateImageForCurrentResult);

  const addUpdManRes = document.getElementById("add-update-manual-result");
  if (addUpdManRes) addUpdManRes.addEventListener("click", addOrUpdateManualResult);

  const postQuizBtn = document.getElementById("post-quiz");
  if (postQuizBtn) postQuizBtn.addEventListener("click", postCustomQuiz);
}

document.addEventListener('DOMContentLoaded', async () => {
  setViews();
  bindUI();
  try {
    quizData = await getItems();
  } catch (e) {
    console.error("Failed to fetch items:", e);
    quizData = [];
  }
  renderCategorySelection();
  switchView('category');
});
