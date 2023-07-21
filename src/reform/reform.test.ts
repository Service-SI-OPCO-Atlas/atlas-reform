import { renderHook, act } from '@testing-library/react-hooks'
import { useForm } from './useForm'
import { PropertyPath, get, isEqual, isMatch, isMatchWith, remove, set, toPath, unset } from 'lodash'

describe('test.reform', () => {

    test('test.touched.setValues', () => {
        const initialValues = {
            name: null as string | null
        }

        const { result } = renderHook(() => useForm({
            initialValues
        }))
        expect(result.current.isDirty()).toBe(false)
        expect(result.current.isTouched()).toBe(false)
        expect(result.current.isTouched("")).toBe(false)
        expect(result.current.isTouched("name")).toBe(false)
        expect(result.current.isTouched("bla")).toBe(false)

        act(() => {
            result.current.setValues({ name: "bla" })
        })
        expect(result.current.isDirty()).toBe(true)
        expect(result.current.isTouched()).toBe(true)
        expect(result.current.isTouched("")).toBe(true)
        expect(result.current.isTouched("name")).toBe(true)
        expect(result.current.isTouched("bla")).toBe(true)
    })

    test('test.touched.setValue', () => {

        const initialValues = {
            person: {
                firstname: "John",
                age: 30,
                friends: [{
                    firstname: "Mike",
                }, {
                    firstname: "Paul",
                    age: 24,
                }]
            },
        }

        const { result } = renderHook(() => useForm({
            initialValues
        }))
        expect(result.current.isDirty()).toBe(false)
        expect(result.current.isTouched()).toBe(false)
        expect(result.current.isTouched("")).toBe(false)
        expect(result.current.isTouched("person")).toBe(false)
        expect(result.current.isTouched("person.firstname")).toBe(false)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(result.current.isTouched("person.friends")).toBe(false)
        expect(result.current.isTouched("person.friends[0]")).toBe(false)
        expect(result.current.isTouched("person.friends[0].firstname")).toBe(false)
        expect(result.current.isTouched("person.friends[1]")).toBe(false)
        expect(result.current.isTouched("person.friends[1].firstname")).toBe(false)
        expect(result.current.isTouched("person.friends[1].age")).toBe(false)

        act(() => {
            result.current.setValue("person.firstname", "Jack", true)
        })
        expect(result.current.isDirty()).toBe(true)
        expect(result.current.isTouched()).toBe(false)
        expect(result.current.isTouched("")).toBe(false)
        expect(result.current.isTouched("person")).toBe(false)
        expect(result.current.isTouched("person.firstname")).toBe(true)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(result.current.isTouched("person.friends")).toBe(false)
        expect(result.current.isTouched("person.friends[0]")).toBe(false)
        expect(result.current.isTouched("person.friends[0].firstname")).toBe(false)
        expect(result.current.isTouched("person.friends[1]")).toBe(false)
        expect(result.current.isTouched("person.friends[1].firstname")).toBe(false)
        expect(result.current.isTouched("person.friends[1].age")).toBe(false)

        act(() => {
            result.current.setValue("person.friends", result.current.values?.person.friends.splice(0, 1), true)
        })
        expect(result.current.isDirty()).toBe(true)
        expect(result.current.isTouched()).toBe(false)
        expect(result.current.isTouched("")).toBe(false)
        expect(result.current.isTouched("person")).toBe(false)
        expect(result.current.isTouched("person.firstname")).toBe(true)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(result.current.isTouched("person.friends")).toBe(true)
        expect(result.current.isTouched("person.friends[0]")).toBe(true)
        expect(result.current.isTouched("person.friends[0].firstname")).toBe(true)
        expect(result.current.isTouched("person.friends[1]")).toBe(true)
        expect(result.current.isTouched("person.friends[1].firstname")).toBe(true)
        expect(result.current.isTouched("person.friends[1].age")).toBe(true)
    })

    test('test.touched.isMatchWith', () => {

        const initialValues = {
            name: "John"
        }

        const values = {
            name: "John",
            "name$full": "John Doe"
        }

        expect(isEqual(values, initialValues)).toBe(false)

        const customizer = (v1: any, v2: any, indexOrKey: PropertyPath) => {
            console.log(indexOrKey)
            return (typeof indexOrKey === 'string' && indexOrKey.endsWith("$full") ? true : undefined)
        }

        expect(isMatch(initialValues, values)).toBe(false)
        //expect(isMatchWith(initialValues, values, customizer)).toBe(false)
        expect(isMatchWith(values, initialValues, customizer)).toBe(true)

        expect(isMatch(values, initialValues)).toBe(true)
        // expect(isMatchWith(values, initialValues)).toBe(true)
    })
})