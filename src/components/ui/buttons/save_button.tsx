export type SaveButtonProps = {
    onClick: () => void;
    isLoading: boolean;
};

export const SaveButton = ({ onClick, isLoading}: SaveButtonProps) => {
    return (
        <button 
            type="button" 
            onClick={onClick} 
            disabled={isLoading}
            className="
            bg-blue-500 text-white py-2 px-4 rounded
            absolute bottom-4 right-4
            text-2xl"
        >
            {isLoading ? 'Saving...' : 'Save'}
        </button>
    );
};
