import React, { useState, useEffect } from 'react';
import { Question } from '../../models/Question';

interface QuestionFormProps {
  onSubmit: (formData: Omit<Question, '_id'>) => void;
  initialData: Partial<Question> | null;
}

const QuestionForm: React.FC<QuestionFormProps> = ({ onSubmit, initialData }) => {
  const [formData, setFormData] = useState<Omit<Question, '_id'>>({
    title: '',
    description: '',
    categories: [],
    difficulty: '',
    questionId: 0
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        categories: initialData.categories || [],
        difficulty: initialData.difficulty || '',
        questionId: initialData.questionId || 0
      });
    }
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      categories: checked
        ? [...prevData.categories, value]
        : prevData.categories.filter(cat => cat !== value)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ title: '', description: '', categories: [], difficulty: '', questionId: 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="question-form">
      <div className="form-section">
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="Question Title"
          required
        />
      </div>

      <div className="form-section">
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Question Description"
          required
        />
      </div>

      <div className="form-section category-group">
        <label>Categories:</label>
        {['algorithms', 'data-structures', 'dynamic-programming', 'graphs', 'strings'].map(category => (
          <label key={category}>
            <input
              type="checkbox"
              name="categories"
              value={category}
              checked={formData.categories.includes(category)}
              onChange={handleCategoryChange}
            />
            {category}
          </label>
        ))}
      </div>

      <div className="form-section">
        <select
          name="difficulty"
          value={formData.difficulty}
          onChange={handleInputChange}
          required
        >
          <option value="">Select Difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <button type="submit" className="submit-btn">{initialData ? 'Update' : 'Submit'}</button>
    </form>
  );
};

export default QuestionForm;