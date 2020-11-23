const boom = require('boom')

const TestResults = require('../models/TestResults')
const QuestionResults = require('../models/QuestionResults')
const Question = require('../models/Question')
const Test = require('../models/Test')

exports.getAllTestResults = async (req, reply) => {
    try {
        const tests = await TestResults.find({})
        return tests
    } catch (err) {
        throw boom.boomify(err)
    }
}

// Get single testResults by ID
exports.getTestResultsById = async (req, reply) => {
    try {
        const id = req.params.id
        const testResults = await TestResults.findById(id)
        return testResults
    } catch (err) {
        throw boom.boomify(err)
    }
}

// Add a new testResults
exports.addTestResult = async (req, reply) => {
    try {
        const testResults = new TestResults(req.body)
        return testResults.save()
    } catch (err) {
        throw boom.boomify(err)
    }
}

exports.countUserTestResults = async (req, reply) => {
    try {
        const _user_id = req.params.user_id
        const _test_id = req.params.test_id
        const _theme_id = req.params.theme_id

        const results = await QuestionResults.find({theme_id: _theme_id, user_id: _user_id, test_id: _test_id})
        const existResult = await TestResults.findOne({theme_id: _theme_id, user_id: _user_id, test_id: _test_id})

        let tests = await Test.findById(_test_id)
        tests.easy_questions = await Promise.all(tests.easy_questions.map(async (q) => {
            const que = await Question.findById(q._id)

            if (que != null) {
                que.right_answers = undefined
                return que
            }
        }))
        tests.medium_questions = await Promise.all(tests.medium_questions.map(async (q) => {
            const que = await Question.findById(q._id)

            if (que != null) {
                que.right_answers = undefined
                return que
            }
        }))
        tests.difficult_questions = await Promise.all(tests.difficult_questions.map(async (q) => {
            const que = await Question.findById(q._id)

            if (que != null) {
                que.right_answers = undefined
                return que
            }
        }))

        let maxP = tests.difficult_questions.length * 6 + tests.medium_questions.length * 4 + tests.easy_questions.length * 2

        if (results.length > 0) {
            let points = 0
            let lessons = []

            await Promise.all(results.map(async (result) => {
                const question = await Question.findById(result.question)

                if (question != null) {
                    if (question.right_answers.every(v => result.user_answers.indexOf(v) >= 0)) {
                        points += question.points
                    } else {
                        lessons.push(question.subtheme)
                    }
                }

                return result
            }))

            let savedProgress
            if (existResult == null) {
                const test_res = new TestResults({
                    user_id: _user_id,
                    test_id: _test_id,
                    theme_id: _theme_id,
                    points,
                    lessons
                })

                savedProgress = await test_res.save()
            } else {
                savedProgress = await TestResults.findByIdAndUpdate(existResult._id, {points, lessons}, { new: true })
            }

            return reply.code(200).send({progress: points / maxP, ...savedProgress})
        }

        return reply.code(400).send({ error: 'Результатов для данного пользователя не найдено' })
    } catch (err) {
        throw boom.boomify(err)
    }
}

exports.countUserTestResultsByTheme = async (req, reply) => {
    try {
        const _user_id = req.params.user_id
        const _theme_id = req.params.theme_id

        const existResult = await TestResults.find({theme_id: _theme_id, user_id: _user_id})

        if (existResult.length > 0) {
            let points = 0
            let lessons = []

            await Promise.all(existResult.map(async (result) => {
                points += result.points
                lessons = lessons.concat(result.lessons)
            }))

            return reply.code(200).send({theme_id: parseInt(_theme_id), user_id: parseInt(_user_id), points, lessons})
        }

        return reply.code(400).send({ error: 'Результатов для данного пользователя не найдено' })
    } catch (err) {
        throw boom.boomify(err)
    }
}



