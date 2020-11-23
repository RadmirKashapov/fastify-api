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

        let existQuestion = await QuestionResults.findOne({theme_id: theme_id, user_id:user_id, test_id: new mongoose.Types.ObjectId(test_id), '_id': new mongoose.Types.ObjectId(question)})

        let currentQuestionResult;
        if (existQuestion == null) {
            const questionResult = new QuestionResults(req.body)
            currentQuestionResult = await Promise.all(questionResult.save())
        } else {
            currentQuestionResult = await Promise.all(QuestionResults.findByIdAndUpdate(existQuestion._id, {user_answers}, {new: true}))
        }

        let maxPointPerTest = await Promise.all(await getMaxPointPerTest(test_id, theme_id))
        maxPointPerTest = maxPointPerTest[0]

        const currentQuestion = await Question.findById(question)

        const currentTestResult = await TestResultModel.findOne({test_id: new mongoose.Types.ObjectId(test_id), user_id: user_id})

        let allUserQuestionResults = await QuestionResults.find({test_id: new mongoose.Types.ObjectId(test_id), user_id: user_id})

        allUserQuestionResults = allUserQuestionResults.map(s => s.question)
        let allQuestionsPerTest = await Question.find({subtheme: theme_id})
        allQuestionsPerTest = allQuestionsPerTest.map(s => s._id)

        let nextQuestion = "-1";
        switch (FuzzyController.getNextQuestionLevel(currentQuestionResult.points / currentQuestion.points, currentTestResult.points / maxPointPerTest)) {
            case  -1:
                allQuestionsPerTest = allQuestionsPerTest.filter(s => s.difficulty === 1 && !allUserQuestionResults.includes(s._id))
                if (allQuestionsPerTest.length > 0) {
                    nextQuestion = allQuestionsPerTest[0]
                }
                break
            case 1:
                allQuestionsPerTest = allQuestionsPerTest.filter(s => s.difficulty === 3 && !allUserQuestionResults.includes(s._id))
                if (allQuestionsPerTest.length > 0) {
                    nextQuestion = allQuestionsPerTest[0]
                }
                break
            default:
                allQuestionsPerTest = allQuestionsPerTest.filter(s => s.difficulty === 2 && !allUserQuestionResults.includes(s._id))
                if (allQuestionsPerTest.length > 0) {
                    nextQuestion = allQuestionsPerTest[0]
                }
        }

        return currentQuestionResult['nextQuestion'] = nextQuestion

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

getMaxPointPerTest = async (_id, _theme_id) => {

    let tests = await TestModel.findOne({theme_id: _theme_id, '_id':_id})
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

    return [Math.max(tests.difficult_questions.length, tests.medium_questions.length, tests.easy_questions.length)]
}