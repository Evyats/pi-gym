const conceptCopy = {
  calibration: ['01 · Calibration', 'Machine-grade precision with a cool daylight field.', '#edf0e8'],
  field: ['02 · Field card', 'A bold coaching sheet built for one-handed use.', '#342c54'],
  cathode: ['03 · Cathode', 'A dark instrument panel where working numbers strike forward.', '#090e18'],
}

const body = document.body
const themeMeta = document.querySelector('meta[name="theme-color"]')
const conceptNote = document.querySelector('.concept-note')
const editButton = document.querySelector('.edit-toggle')

function chooseConcept(concept) {
  body.dataset.concept = concept
  document.querySelectorAll('[data-set-concept]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.setConcept === concept))
  })
  const [title, description, theme] = conceptCopy[concept]
  conceptNote.querySelector('b').textContent = title
  conceptNote.querySelector('span').textContent = description
  themeMeta.content = theme
  const url = new URL(window.location)
  url.searchParams.set('concept', concept)
  window.history.replaceState({}, '', url)
}

function chooseView(view) {
  body.dataset.view = view
  document.querySelectorAll('[data-view-target]').forEach((button) => {
    if (button.dataset.viewTarget === view) button.setAttribute('aria-current', 'page')
    else button.removeAttribute('aria-current')
  })
  document.querySelectorAll('[data-panel]').forEach((panel) => {
    const active = panel.dataset.panel === view
    panel.hidden = !active
    panel.classList.toggle('is-active', active)
  })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

document.querySelectorAll('[data-set-concept]').forEach((button) => {
  button.addEventListener('click', () => chooseConcept(button.dataset.setConcept))
})

document.querySelectorAll('[data-view-target]').forEach((button) => {
  button.addEventListener('click', () => chooseView(button.dataset.viewTarget))
})

editButton.addEventListener('click', () => {
  const editing = body.dataset.editing !== 'true'
  body.dataset.editing = String(editing)
  editButton.setAttribute('aria-pressed', String(editing))
  editButton.querySelector('span').textContent = editing ? 'Done' : 'Edit plan'
})

document.querySelectorAll('.complete-control').forEach((button) => {
  button.addEventListener('click', () => button.closest('.exercise-row').classList.toggle('is-complete'))
})

document.querySelectorAll('.measure').forEach((button) => {
  button.addEventListener('click', () => {
    const value = button.querySelector('strong')
    const step = Number(button.dataset.step)
    const next = Number(value.textContent) + step
    value.textContent = Number.isInteger(next) ? String(next) : String(Number(next.toFixed(2)))
    button.animate(
      [{ transform: 'scale(.92)' }, { transform: 'scale(1)' }],
      { duration: 180, easing: 'cubic-bezier(.16, 1, .3, 1)' },
    )
  })
})

document.querySelector('[data-add-weight]').addEventListener('click', (event) => {
  const button = event.currentTarget
  button.textContent = 'Added 78.4 kg'
  button.disabled = true
})

document.querySelector('[data-mark-today]').addEventListener('click', (event) => {
  const today = document.querySelector('.calendar-grid .today')
  const trained = today.classList.toggle('trained')
  event.currentTarget.textContent = trained ? 'Unmark today' : 'Mark today'
})

document.querySelectorAll('.calendar-grid button:not(.future)').forEach((button) => {
  button.addEventListener('click', () => {
    if (body.dataset.editing === 'true') button.classList.toggle('trained')
  })
})

const initialConcept = new URL(window.location).searchParams.get('concept')
if (conceptCopy[initialConcept]) chooseConcept(initialConcept)
