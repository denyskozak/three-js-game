import './Interface.css';

export const Interface = () => {
    return (
        <div className="interface-container">
            <div className="bar-container hp-bar-container">
                <div className="bar-fill hp-bar-fill" id="hpBar"></div>
            </div>

            <div className="bar-container mana-bar-container">
                <div className="bar-fill mana-bar-fill" id="manaBar"></div>
            </div>

        </div>
    )
}