import { renderHook, act } from '@testing-library/react-hooks'
import { reformContext, useForm } from '../src/reform/useForm'
import { Yop } from '@dsid-opcoatlas/yop'
import { SetValueOptions } from '../src/reform/FormManager'

describe('test.reform', () => {

    test('test.setValue', async () => {

        const { result } = renderHook(() => useForm({
            initialValues: {
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
            },
            validationSchema: Yop.object({
                person: Yop.object({
                    firstname: Yop.string(),
                    age: Yop.number(),
                    friends: Yop.array(Yop.object({
                        firstname: Yop.string().required(),
                        age: Yop.number().min(0),
                    }))

                })
            })
        }))

        expect(result.current.isDirty()).toBe(false)
        expect(result.current.isTouched("person")).toBe(false)
        expect(result.current.isTouched("person.firstname")).toBe(false)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(result.current.isTouched("person.friends")).toBe(false)
        expect(result.current.isTouched("person.friends[0]")).toBe(false)
        expect(result.current.isTouched("person.friends[0].firstname")).toBe(false)
        expect(result.current.isTouched("person.friends[0].age")).toBe(false)
        expect(result.current.isTouched("person.friends[1]")).toBe(false)
        expect(result.current.isTouched("person.friends[1].firstname")).toBe(false)
        expect(result.current.isTouched("person.friends[1].age")).toBe(false)
        expect(result.current.getErrorCount()).toEqual(0)

        await act(async () => {
            await result.current.setValue("person.firstname", "Jack", true)
        })
        expect(result.current.isDirty()).toBe(true)
        expect(result.current.isTouched("person")).toBe(true)
        expect(result.current.isTouched("person.firstname")).toBe(true)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(result.current.isTouched("person.friends")).toBe(false)
        expect(result.current.isTouched("person.friends[0]")).toBe(false)
        expect(result.current.isTouched("person.friends[0].firstname")).toBe(false)
        expect(result.current.isTouched("person.friends[1]")).toBe(false)
        expect(result.current.isTouched("person.friends[1].firstname")).toBe(false)
        expect(result.current.isTouched("person.friends[1].age")).toBe(false)
        expect(result.current.getErrorCount()).toEqual(0)

        await act(async () => {
            await result.current.setValue("person.friends[0].firstname", "Jim", SetValueOptions.Touch | SetValueOptions.Validate)
        })
        expect(result.current.isDirty()).toBe(true)
        expect(result.current.isTouched("person")).toBe(true)
        expect(result.current.isTouched("person.firstname")).toBe(true)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(result.current.isTouched("person.friends")).toBe(true)
        expect(result.current.isTouched("person.friends[0]")).toBe(true)
        expect(result.current.isTouched("person.friends[0].firstname")).toBe(true)
        expect(result.current.isTouched("person.friends[0].age")).toBe(false)
        expect(result.current.isTouched("person.friends[1]")).toBe(false)
        expect(result.current.isTouched("person.friends[1].firstname")).toBe(false)
        expect(result.current.isTouched("person.friends[1].age")).toBe(false)
        expect(result.current.getErrorCount()).toEqual(0)

        await act(async () => {
            await result.current.setValue("person.friends[1].firstname", null, SetValueOptions.Touch)
            await result.current.setValue("person.friends[1].age", -1, true)
        })
        expect(result.current.isDirty()).toBe(true)
        expect(result.current.isTouched("person")).toBe(true)
        expect(result.current.isTouched("person.firstname")).toBe(true)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(result.current.isTouched("person.friends")).toBe(true)
        expect(result.current.isTouched("person.friends[0]")).toBe(true)
        expect(result.current.isTouched("person.friends[0].firstname")).toBe(true)
        expect(result.current.isTouched("person.friends[0].age")).toBe(false)
        expect(result.current.isTouched("person.friends[1]")).toBe(true)
        expect(result.current.isTouched("person.friends[1].firstname")).toBe(true)
        expect(result.current.isTouched("person.friends[1].age")).toBe(true)
        expect(result.current.getErrorCount()).toEqual(2)
        expect(result.current.getError("person.friends[1].firstname")).not.toBeUndefined()
        expect(result.current.getError("person.friends[1].age")).not.toBeUndefined()

        await act(async () => {
            await result.current.setValue("person.friends[1].firstname", null, SetValueOptions.Untouch | SetValueOptions.Validate)
        })

        expect(result.current.isDirty()).toBe(true)
        expect(result.current.isTouched("person")).toBe(true)
        expect(result.current.isTouched("person.firstname")).toBe(true)
        expect(result.current.isTouched("person.age")).toBe(false)
        expect(result.current.isTouched("person.friends")).toBe(true)
        expect(result.current.isTouched("person.friends[0]")).toBe(true)
        expect(result.current.isTouched("person.friends[0].firstname")).toBe(true)
        expect(result.current.isTouched("person.friends[0].age")).toBe(false)
        expect(result.current.isTouched("person.friends[1]")).toBe(true)
        expect(result.current.isTouched("person.friends[1].firstname")).toBe(false)
        expect(result.current.isTouched("person.friends[1].age")).toBe(true)
        expect(result.current.getErrorCount()).toEqual(1)
        expect(result.current.getError("person.friends[1].firstname")).toBeUndefined()
        expect(result.current.getError("person.friends[1].age")).not.toBeUndefined()
    })

    test('test.array', async () => {

        type Friend = {
            firstname: string
            age?: number
        }

        const { result } = renderHook(() => useForm({
            initialValues: {
                person: {
                    firstname: "John",
                    age: 30,
                    friends: [] as Friend[]
                },
            },
            validationSchema: Yop.object({
                person: Yop.object({
                    firstname: Yop.string(),
                    age: Yop.number(),
                    friends: Yop.array(Yop.object({
                        firstname: Yop.string().required(),
                        age: Yop.number().min(0),
                    }))
                })
            })
        }))

        const friendsTouchedState = () => {
            return Array.from(Array((result.current.values?.person.friends ?? []).length).keys()).map(index => [
                result.current.isTouched(`person.friends[${ index }]`),
                result.current.isTouched(`person.friends[${ index }].firstname`),
                result.current.isTouched(`person.friends[${ index }].age`),
            ])
        }

        expect(result.current.isDirty()).toBe(false)

        expect(result.current.isTouched("person")).toBeFalsy()
        expect(result.current.isTouched("person.friends")).toBeFalsy()
        expect(result.current.isTouched("person.firstname")).toBeFalsy()
        expect(result.current.isTouched("person.age")).toBeFalsy()
        expect(friendsTouchedState()).toEqual([])

        expect(result.current.getErrorCount()).toEqual(0)

        await act(async () => {
            await result.current.setValue("person.friends[0].firstname", "Joe", SetValueOptions.Touch)
            await result.current.setValue("person.friends[0].age", -1, SetValueOptions.Touch)
            await result.current.setValue("person.friends[1].firstname", "Mike", SetValueOptions.Touch)
            await result.current.setValue("person.friends[2].firstname", null, SetValueOptions.Touch)
            await result.current.setValue("person.friends[2].age", 24, SetValueOptions.Touch)
            await result.current.setValue("person.friends[3].firstname", "Jim", true)
        })

        expect(result.current.isDirty()).toBe(true)

        expect(result.current.isTouched("person")).toBeTruthy()
        expect(result.current.isTouched("person.friends")).toBeTruthy()
        expect(result.current.isTouched("person.firstname")).toBeFalsy()
        expect(result.current.isTouched("person.age")).toBeFalsy()
        expect(friendsTouchedState()).toEqual([
            [true, true, true],
            [true, true, false],
            [true, true, true],
            [true, true, false],
        ])

        expect(result.current.getErrorCount()).toEqual(2)
        expect(result.current.getError("person.friends[0].age")).not.toBeUndefined()
        expect(result.current.getError("person.friends[2].firstname")).not.toBeUndefined()

        await act(async () => {
            await result.current.array<Friend>("person.friends")?.append({ firstname: "John" })
        })

        expect(result.current.isDirty()).toBe(true)

        expect(result.current.isTouched("person")).toBeTruthy()
        expect(result.current.isTouched("person.friends")).toBeTruthy()
        expect(result.current.isTouched("person.firstname")).toBeFalsy()
        expect(result.current.isTouched("person.age")).toBeFalsy()
        expect(friendsTouchedState()).toEqual([
            [true, true, true],
            [true, true, false],
            [true, true, true],
            [true, true, false],
            [false, false, false],
        ])

        expect(result.current.getErrorCount()).toEqual(2)
        expect(result.current.getError("person.friends[0].age")).not.toBeUndefined()
        expect(result.current.getError("person.friends[2].firstname")).not.toBeUndefined()

        await act(async () => {
            await result.current.array("person.friends")?.swap(0, 3)
        })

        expect(result.current.isDirty()).toBe(true)

        expect(result.current.isTouched("person")).toBeTruthy()
        expect(result.current.isTouched("person.friends")).toBeTruthy()
        expect(result.current.isTouched("person.firstname")).toBeFalsy()
        expect(result.current.isTouched("person.age")).toBeFalsy()
        expect(friendsTouchedState()).toEqual([
            [true, true, false],
            [true, true, false],
            [true, true, true],
            [true, true, true],
            [false, false, false],
        ])

        expect(result.current.getErrorCount()).toEqual(2)
        expect(result.current.getError("person.friends[2].firstname")).not.toBeNull()
        expect(result.current.getError("person.friends[3].age")).not.toBeNull()

        await act(async () => {
            await result.current.array("person.friends")?.move(0, 2)
        })

        expect(result.current.isDirty()).toBe(true)

        expect(result.current.isTouched("person")).toBeTruthy()
        expect(result.current.isTouched("person.friends")).toBeTruthy()
        expect(result.current.isTouched("person.firstname")).toBeFalsy()
        expect(result.current.isTouched("person.age")).toBeFalsy()
        expect(friendsTouchedState()).toEqual([
            [true, true, false],
            [true, true, true],
            [true, true, false],
            [true, true, true],
            [false, false, false],
        ])

        expect(result.current.getErrorCount()).toEqual(2)
        expect(result.current.getError("person.friends[1].firstname")).not.toBeNull()
        expect(result.current.getError("person.friends[3].age")).not.toBeNull()

        await act(async () => {
            await result.current.array<Friend>("person.friends")?.replace(2, { firstname: "Frank", age: 23 })
        })

        expect(result.current.isDirty()).toBe(true)

        expect(result.current.isTouched("person")).toBeTruthy()
        expect(result.current.isTouched("person.friends")).toBeTruthy()
        expect(result.current.isTouched("person.firstname")).toBeFalsy()
        expect(result.current.isTouched("person.age")).toBeFalsy()
        expect(friendsTouchedState()).toEqual([
            [true, true, false],
            [true, true, true],
            [false, false, false],
            [true, true, true],
            [false, false, false],
        ])

        expect(result.current.getErrorCount()).toEqual(2)
        expect(result.current.getError("person.friends[1].firstname")).not.toBeNull()
        expect(result.current.getError("person.friends[3].age")).not.toBeNull()

        await act(async () => {
            await result.current.array<Friend>("person.friends")?.insert(2, { firstname: "Will", age: 25 })
        })

        expect(result.current.isDirty()).toBe(true)

        expect(result.current.isTouched("person")).toBeTruthy()
        expect(result.current.isTouched("person.friends")).toBeTruthy()
        expect(result.current.isTouched("person.firstname")).toBeFalsy()
        expect(result.current.isTouched("person.age")).toBeFalsy()
        expect(friendsTouchedState()).toEqual([
            [true, true, false],
            [true, true, true],
            [false, false, false],
            [false, false, false],
            [true, true, true],
            [false, false, false],
        ])

        expect(result.current.getErrorCount()).toEqual(2)
        expect(result.current.getError("person.friends[1].firstname")).not.toBeNull()
        expect(result.current.getError("person.friends[3].age")).not.toBeNull()

        await act(async () => {
            await result.current.setValue("person.friends[2].age", -1, true)
        })

        expect(result.current.isDirty()).toBe(true)

        expect(result.current.isTouched("person")).toBeTruthy()
        expect(result.current.isTouched("person.friends")).toBeTruthy()
        expect(result.current.isTouched("person.firstname")).toBeFalsy()
        expect(result.current.isTouched("person.age")).toBeFalsy()
        expect(friendsTouchedState()).toEqual([
            [true, true, false],
            [true, true, true],
            [true, false, true],
            [false, false, false],
            [true, true, true],
            [false, false, false],
        ])

        expect(result.current.getErrorCount()).toEqual(3)
        expect(result.current.getError("person.friends[1].firstname")).not.toBeNull()
        expect(result.current.getError("person.friends[2].age")).not.toBeNull()
        expect(result.current.getError("person.friends[3].age")).not.toBeNull()

        await act(async () => {
            await result.current.array("person.friends")?.remove(1)
        })

        expect(result.current.isDirty()).toBe(true)

        expect(result.current.isTouched("person")).toBeTruthy()
        expect(result.current.isTouched("person.friends")).toBeTruthy()
        expect(result.current.isTouched("person.firstname")).toBeFalsy()
        expect(result.current.isTouched("person.age")).toBeFalsy()
        expect(friendsTouchedState()).toEqual([
            [true, true, false],
            [true, false, true],
            [false, false, false],
            [true, true, true],
            [false, false, false],
        ])

        expect(result.current.getErrorCount()).toEqual(2)
        expect(result.current.getError("person.friends[2].age")).not.toBeNull()
        expect(result.current.getError("person.friends[3].age")).not.toBeNull()

        await act(async () => {
            await result.current.array("person.friends")?.clear()
        })

        expect(result.current.isDirty()).toBe(false)

        expect(result.current.isTouched("person")).toBeTruthy()
        expect(result.current.isTouched("person.friends")).toBeTruthy()
        expect(result.current.isTouched("person.firstname")).toBeFalsy()
        expect(result.current.isTouched("person.age")).toBeFalsy()
        expect(friendsTouchedState()).toEqual([])

        expect(result.current.getErrorCount()).toEqual(0)
    })

    test('test.async', async () => {

        type Friend = {
            firstname: string
            age?: number
        }

        const { result } = renderHook(() => useForm({
            initialValues: {
                person: {
                    firstname: "John",
                    age: 30,
                },
            },
            validationSchema: Yop.object({
                person: Yop.object({
                    firstname: Yop.string(),
                    age: Yop.number().asyncTest<Friend>(context => {
                        return new Promise<boolean>((resolve, reject) => {
                            const form = reformContext(context)
                            form.setAsyncResultPending(context.path!, "Validation pending")
                            setTimeout(() => resolve(true), 1000)
                        })
                    }),
                })
            })
        }))

        await act(async () => {
            const promise = result.current.setValue("person.firstname", "Jack", true)
            expect(result.current.getError("person.age")).toEqual({
                code: 'asyncTest',
                value: 30,
                path: 'person.age',
                message: 'Validation pending',
                status: 'pending'
            })
            await promise
        })

        expect(result.current.getError("person.age")).toBeUndefined()
    })
})