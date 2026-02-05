import mongoose from 'mongoose'
import { Room } from '../models/Room'
import { Question } from '../models/Question'
import * as fs from 'fs'
import * as path from 'path'

export const seedDatabase = async () => {
  try {
    // Check if questions already exist
    const existingQuestions = await Question.countDocuments()
    console.log(`Existing questions count: ${existingQuestions}`)
    
    if (existingQuestions === 0) {
      // Load questions from seed file
      const seedPath = path.join(process.cwd(), 'seed', 'questions.json')
      console.log(`Loading questions from: ${seedPath}`)
      
      const raw = fs.readFileSync(seedPath, 'utf-8')
      const questionsData = JSON.parse(raw)
      console.log(`Loaded ${questionsData.length} questions from seed file`)
      
      // Transform and insert questions
      const questionsToInsert = questionsData.map((q: any) => ({
        questionId: q._id,
        title: q.title,
        description: q.description,
        difficulty: q.difficulty,
        tags: q.tags,
        sampleInput: q.sampleInput,
        sampleOutput: q.sampleOutput
      }))
      
      await Question.insertMany(questionsToInsert)
      console.log('Database seeded with questions')
    } else {
      console.log('Questions already exist in database')
    }
  } catch (error) {
    console.error('Error seeding database:', error)
  }
}
