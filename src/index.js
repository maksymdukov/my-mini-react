import React, { useState } from './react/React';
import './main.css';

const TodoItem = ({ children, setTodos, todo }) => (
  <li
    onClick={() => {
      setTodos((prevState) => prevState.filter((td) => td !== todo));
    }}
  >
    {children}
  </li>
);

const Main = () => {
  const [todoInput, setTodoInput] = useState('');
  const [todos, setTodos] = useState([]);

  const addTodo = () => {
    setTodos([...todos, todoInput]);
    setTodoInput('');
  };

  const handleKeyDown = (e) => {
    if (e.keyCode === 13) {
      addTodo();
    }
  };

  const handleInput = (e) => {
    setTodoInput(e.target.value);
  };

  const handleReverse = () => {
    setTodos([...todos].reverse());
  };
  return (
    <div className="main">
      <div className="todos">
        {todos.map((todo) => (
          <TodoItem key={todo} todo={todo} setTodos={setTodos}>
            {todo}
          </TodoItem>
        ))}
      </div>
      <div className="add-todo">
        <input
          type="text"
          value={todoInput}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
        />
        <button type="button" onClick={addTodo}>
          Add todo
        </button>
        <button type="button" onClick={handleReverse}>
          Reverse
        </button>
      </div>
    </div>
  );
};

const root = document.getElementById('root');

React.render(<Main />, root);
