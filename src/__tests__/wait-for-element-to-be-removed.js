import {renderIntoDocument} from './helpers/test-utils'

function importModule() {
  return require('../').waitForElementToBeRemoved
}

let waitForElementToBeRemoved

beforeEach(() => {
  jest.useRealTimers()
  jest.resetModules()
  waitForElementToBeRemoved = importModule()
})

test('resolves on mutation only when the element is removed', async () => {
  const {queryAllByTestId} = renderIntoDocument(`
    <div data-testid="div"></div>
    <div data-testid="div"></div>
  `)
  const divs = queryAllByTestId('div')
  // first mutation
  setTimeout(() => {
    divs.forEach(d => d.setAttribute('id', 'mutated'))
  })
  // removal
  setTimeout(() => {
    divs.forEach(div => div.parentElement.removeChild(div))
  }, 100)
  // the timeout is here for two reasons:
  // 1. It helps test the timeout config
  // 2. The element should be removed immediately
  //    so if it doesn't in the first 100ms then we know something's wrong
  //    so we'll fail early and not wait the full timeout
  await waitForElementToBeRemoved(() => queryAllByTestId('div'), {timeout: 200})
})

test('resolves on mutation if callback throws an error', async () => {
  const {getByTestId} = renderIntoDocument(`
  <div data-testid="div"></div>
`)
  const div = getByTestId('div')
  setTimeout(() => {
    div.parentElement.removeChild(div)
  })
  await waitForElementToBeRemoved(() => getByTestId('div'), {timeout: 100})
})

test('requires a function as the first parameter', () => {
  return expect(
    waitForElementToBeRemoved(),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"waitForElementToBeRemoved requires a callback as the first parameter"`,
  )
})

test('requires an element to exist first', () => {
  return expect(
    waitForElementToBeRemoved(() => null),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"The callback function which was passed did not return an element or non-empty array of elements. waitForElementToBeRemoved requires that the element(s) exist before waiting for removal."`,
  )
})

test('requires an unempty array of elements to exist first', () => {
  return expect(
    waitForElementToBeRemoved(() => []),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"The callback function which was passed did not return an element or non-empty array of elements. waitForElementToBeRemoved requires that the element(s) exist before waiting for removal."`,
  )
})

describe('timers', () => {
  const expectElementToBeRemoved = async () => {
    const importedWaitForElementToBeRemoved = importModule()

    const {queryAllByTestId} = renderIntoDocument(`
  <div data-testid="div"></div>
  <div data-testid="div"></div>
`)
    const divs = queryAllByTestId('div')
    // first mutation
    setTimeout(() => {
      divs.forEach(d => d.setAttribute('id', 'mutated'))
    })
    // removal
    setTimeout(() => {
      divs.forEach(div => div.parentElement.removeChild(div))
    }, 100)

    const promise = importedWaitForElementToBeRemoved(
      () => queryAllByTestId('div'),
      {
        timeout: 200,
      },
    )

    if (setTimeout._isMockFunction) {
      jest.advanceTimersByTime(110)
    }

    await promise
  }

  it('works with real timers', async () => {
    jest.useRealTimers()
    await expectElementToBeRemoved()
  })
  it('works with fake timers', async () => {
    jest.useFakeTimers()
    await expectElementToBeRemoved()
  })
})

test("doesn't change jest's timers value when importing the module", () => {
  jest.useFakeTimers()
  importModule()

  expect(window.setTimeout._isMockFunction).toEqual(true)
})
