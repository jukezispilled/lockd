// components/ChatSuccessNotification.js

export const ChatSuccessNotification = ({ chatData, onViewChat, onDismiss }) => {
    if (!chatData) return null;
  
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-green-800 font-semibold">Squad Created!</h4>
            <p className="text-green-700 text-sm pr-2">
              {chatData.chatName} is ready for your community
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onViewChat(chatData.chatId)}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
            >
              View
            </button>
            <button
              onClick={onDismiss}
              className="text-green-600 hover:text-green-800 px-2"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
};