const boom = require('boom')

const QuestionResults = require('../models/QuestionResults')
const FuzzyController = require('../controllers/fuzzyController')
const TestModel = require('../models/Test')
const TestResultModel = require('../models/TestResults')
const Question = require('../models/Question')

// Get all questionResults
exports.getAllQuestionResults = async (req, reply) => {
    try {
        const questionResults = await QuestionResults.find({})
        return questionResults
    } catch (err) {
        throw boom.boomify(err)
    }
}

// Get single questionResult by ID
exports.getQuestionResultsById = async (req, reply) => {
    try {
        const id = req.params.id
        const questionResult = await QuestionResults.findById(id)
        return questionResult
    } catch (err) {
        throw boom.boomify(err)
    }
}

// Add a new questionResult
exports.addQuestionResults = async (req, reply) => {
    try {
        const {user_id, theme_id, test_id, question, user_answers} = req.body

        let existQuestion = await QuestionResults.findOne({theme_id: theme_id, user_id:user_id, test_id: test_id, _id: question})

        let currentQuestionResult;
        if (existQuestion == null) {
            const questionResult = new QuestionResults(req.body)
            currentQuestionResult = await Promise.all(questionResult.save())
        } else {
            currentQuestionResult = await Promise.all(QuestionResults.findByIdAndUpdate(existQuestion._id, {user_answers}, {new: true}))
        }

        let maxPointPerTest = await Promise.all(this.getMaxPointPerTest(test_id, theme_id))

        return currentQuestionResult




    } catch (err) {
        throw boom.boomify(err)
    }
}

// Update an existing questionResult
exports.updateQuestionResults = async (req, reply) => {
    try {
        const id = req.params.id
        const questionResult = req.body
        const { ...updateData } = questionResult
        const update = await QuestionResults.findByIdAndUpdate(id, updateData, { new: true })
        return update
    } catch (err) {
        throw boom.boomify(err)
    }
}

// Delete a questionResult
exports.deleteQuestionResults = async (req, reply) => {
    try {
        const id = req.params.id
        const questionResult = await QuestionResults.findByIdAndRemove(id)
        return questionResult
    } catch (err) {
        throw boom.boomify(err)
    }
}

exports.getMaxPointPerTest = async (_id, _theme_id) => {

    let tests = await Test.findOne({theme_id: _theme_id, _id})
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

    let maxPointPerTest = 0

    tests.easy_questions.forEach(s => {
        maxPointPerTest += s.points
    })

    tests.medium_questions.forEach(s => {
        maxPointPerTest += s.points
    })

    tests.difficult_questions.forEach(s => {
        maxPointPerTest += s.points
    })

    return maxPointPerTest
}